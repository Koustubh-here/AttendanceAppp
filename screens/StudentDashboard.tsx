  import React, { useState, useEffect, useRef } from "react";
  import {
    View,
    Text,
    StyleSheet,
    Platform,
    PermissionsAndroid,
    Linking,
    Alert,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Modal,
    BackHandler,
  } from "react-native";
  import NetInfo from "@react-native-community/netinfo";
  import MaterialIcons from "react-native-vector-icons/MaterialIcons";
  import { getAuth, signOut } from "firebase/auth";
  import { useNavigation } from "@react-navigation/native"; 
  import { ROUTES } from "../navigation/AppNavigator";
  import { collection, query, getDocs, where, getDoc, doc, updateDoc, arrayUnion, arrayRemove, onSnapshot,addDoc} from "firebase/firestore";
  import { db } from "../firebaseConfig"; // Make sure you have this import
  import ReactNativeBiometrics from 'react-native-biometrics';
  

  export default function StudentDashboard() {
    const navigation = useNavigation();
    const [wifiConnected, setWifiConnected] = useState(false);
    const [currentSSID, setCurrentSSID] = useState("");
    const [currentBSSID, setCurrentBSSID] = useState("");
    const [debugInfo, setDebugInfo] = useState("");
    const [permissionStatus, setPermissionStatus] = useState(null);
    const [showNotification, setShowNotification] = useState(false);
    const [studentName, setStudentName] = useState("");
    const [studentId, setStudentId] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [attendanceMode, setAttendanceMode] = useState("normal");
    const [activeClass, setActiveClass] = useState(null);
    const [timer, setTimer] = useState(0);
    const timerRef = useRef(null);
    const classListenerRef = useRef(null);
    const [attendanceSummary, setAttendanceSummary] = useState([]);
    
    // Updated states for course registration
    const [registeredCourses, setRegisteredCourses] = useState([]);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [availableClasses, setAvailableClasses] = useState([]);
    const [showRegistrationModal, setShowRegistrationModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [showClassesModal, setShowClassesModal] = useState(false);
    const [courseClasses, setCourseClasses] = useState({});
    

    const auth = getAuth();

    // Getuser data on componennt mount
    useEffect(() => {
      const getUserData = async () => {
        try {
          const user = auth.currentUser;

          if (user) {
            // For basic implementation, we'll just use the email name part
            const emailName = user.email.split("@")[0];
            
            // Get student information from Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
              // Get student name from Firestore if available, otherwise use email name
              if (userDoc.data().name) {
                setStudentName(userDoc.data().name);
              } else {
                setStudentName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
              }
              
              // Getingg student-ID from Firetore if available
              if (userDoc.data().studentId) {
                setStudentId(userDoc.data().studentId);
              } else if (userDoc.data().rollNo) {
                setStudentId(userDoc.data().rollNo);
              }
            } else {
              // If no user doc exists, fallback to email name
              setStudentName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
            }
            
            // Load registered and available courses
            fetchCoursesData(user.uid);
            fetchAttendanceData(user.uid);
          } else {
            // If no user is logged in, redirect to welcome screen
            navigation.replace(ROUTES.WELCOME);
          }
        } catch (error) {
          console.error("Error getting user data:", error);
        } finally {
          setIsLoading(false);
        }
      };

      getUserData();
      
      // Set up a periodic check to refresh class status
      const intervalId = setInterval(() => {
        const user = auth.currentUser;
        if (user) {
          fetchCoursesData(user.uid);
          fetchAttendanceData(user.uid);
        }
      }, 30000); // Check every 30 seconds for class status updates
      
      return () => clearInterval(intervalId);
    }, []);

    // Clean up timer and listener when component unmounts
    // Add this useEffect hook to your StudentDashboard component
useEffect(() => {
  // Prevent going back to the welcome screen when pressing the back button
  const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
    // Return true to prevent default behavior (going back)
    return true;
  });

  return () => backHandler.remove();
}, []);

    // Fetch available courses and registered courses from Firestore
// Fetch available courses and registered courses from Firestore
const fetchCoursesData = async (userId) => {
  try {
    // Fetch all available courses
    const coursesQuery = query(collection(db, "courses"));
    const coursesSnapshot = await getDocs(coursesQuery);
    
    const coursesList = [];
    coursesSnapshot.forEach((doc) => {
      coursesList.push({
        id: doc.id,
        code: doc.data().code,
        name: doc.data().name,
        professorId: doc.data().professorId
      });
    });
    
    // Fetch user document to get registered courses
    const userDoc = await getDoc(doc(db, "users", userId));
    let registeredCourseIds = [];
    
    if (userDoc.exists() && userDoc.data().enrolledCourses) {
      registeredCourseIds = userDoc.data().enrolledCourses;
    }
    
    // Get full details of registered courses including classes
    const registeredCoursesList = [];
    const allCourseClasses = {};
    
    for (const courseId of registeredCourseIds) {
      const courseDoc = await getDoc(doc(db, "courses", courseId));
      
      if (courseDoc.exists()) {
        // Fetch classes for this course
        const classesQuery = query(
          collection(db, "classes"), 
          where("courseId", "==", courseId)
        );
        const classesSnapshot = await getDocs(classesQuery);
        
        const courseClasses = [];
        const completedClasses = [];
        
        classesSnapshot.forEach((doc) => {
          const classData = doc.data();
          // Check if class is completed (not active and has an end time)
          const isCompleted = !classData.isActive && classData.endTime;
          
          if (isCompleted) {
            completedClasses.push({
              id: doc.id,
              ...classData
            });
          }
          
          // Using the isActive field from the database directly instead of calculating it
          courseClasses.push({
            id: doc.id,
            ...classData,
            isActive: classData.isActive || false
          });
        });
        
        // Store all classes for this course
        allCourseClasses[courseId] = courseClasses;
        
        // Add course with its classes to registered courses
        if (courseClasses.length > 0) {
          courseClasses.forEach(classItem => {
            registeredCoursesList.push({
              id: classItem.id,
              courseId: courseId,
              time: classItem.time,
              subject: courseDoc.data().name,
              code: courseDoc.data().code,
              professor: "Prof. ID: " + classItem.professorId,
              room: "Room " + classItem.roomNumber,
              date: classItem.date,
              isActive: classItem.isActive || false,
              studentsConnected: classItem.studentsConnected || [],
              studentsPresent: classItem.studentsPresent || 0
            });
          });
        }
        
        // Update attendance records for completed classes
        await updateAttendanceForCompletedClasses(userId, courseId, completedClasses);
      }
    }
    
    // Filter out registered courses from available courses
    const availableCoursesList = coursesList.filter(
      course => !registeredCourseIds.includes(course.id)
    );
    
    setRegisteredCourses(registeredCoursesList);
    setAvailableCourses(availableCoursesList);
    setCourseClasses(allCourseClasses);
    
    // Check if the active class is still active
    if (activeClass) {
      const updatedClass = registeredCoursesList.find(c => c.id === activeClass.id);
      if (updatedClass) {
        // If class is no longer active but student is still in active mode, force disconnect
        if (!updatedClass.isActive && attendanceMode === "active") {
          console.log("Class is no longer active, forcing disconnect");
          // Class has been ended by professor, disconnect student
          handleClassEnded();
        }
      } else {
        // Class no longer exists or is not accessible
        resetAttendanceTracking();
      }
    }
  } catch (error) {
    console.error("Error fetching courses data:", error);
    Alert.alert("Error", "Failed to load courses. Please try again.");
  }
};
const updateAttendanceForCompletedClasses = async (studentId, courseId, completedClasses) => {
  try {
    if (completedClasses.length === 0) return;

    // Query to check if entry already exists for this course
    const courseAttendanceQuery = query(
      collection(db, "studentCourseAttendance"),
      where("studentId", "==", studentId),
      where("courseId", "==", courseId)
    );
    
    const courseAttendanceSnapshot = await getDocs(courseAttendanceQuery);
    
    // Get total number of classes for this course
    const classesQuery = query(
      collection(db, "classes"),
      where("courseId", "==", courseId)
    );
    const classesSnapshot = await getDocs(classesQuery);
    const totalClassesHeld = classesSnapshot.size;
    
    // For each completed class, check if student attended
    let newClassesAttended = 0;
    let existingAttendanceRecord = null;
    
    // Get existing attendance record if it exists
    if (!courseAttendanceSnapshot.empty) {
      existingAttendanceRecord = {
        id: courseAttendanceSnapshot.docs[0].id,
        ...courseAttendanceSnapshot.docs[0].data()
      };
      newClassesAttended = existingAttendanceRecord.classesAttended || 0;
    }
    
    // Track which classes need attendance records
    const classesNeedingAttendanceRecords = [];
    
    for (const completedClass of completedClasses) {
      // Check if student already has an attendance record for this class
      const attendanceQuery = query(
        collection(db, "studentAttendance"),
        where("studentId", "==", studentId),
        where("classId", "==", completedClass.id)
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      // If no attendance record exists, create one marking the student as absent
      if (attendanceSnapshot.empty) {
        classesNeedingAttendanceRecords.push(completedClass);
      }
    }
    
    // Create attendance records for all classes needing them
    const batch = [];
    for (const classItem of classesNeedingAttendanceRecords) {
      // Add a record to studentAttendance marking the student as absent
      batch.push(
        addDoc(collection(db, "studentAttendance"), {
          studentId: studentId,
          classId: classItem.id,
          courseId: courseId,
          date: classItem.date ? new Date(classItem.date) : new Date(),
          joinTime: null,
          leaveTime: null,
          studentDuration: 0,
          attendanceMet: false,
          bioVerified: false,
          isPresent: false,
          autoGenerated: true // Mark that this was automatically generated
        })
      );
    }
    
    // Execute all attendance record creations
    await Promise.all(batch);
    
    // Now update the overall course attendance record
    const attendancePercentage = totalClassesHeld > 0 
      ? Math.round((newClassesAttended / totalClassesHeld) * 100) 
      : 0;
    
    if (existingAttendanceRecord) {
      // Update existing record with latest total classes
      const docRef = doc(db, "studentCourseAttendance", existingAttendanceRecord.id);
      await updateDoc(docRef, {
        totalClassesHeld: totalClassesHeld,
        attendancePercentage: attendancePercentage,
        lastUpdated: new Date()
      });
    } else if (totalClassesHeld > 0) {
      // Create a new record if one doesn't exist
      await addDoc(collection(db, "studentCourseAttendance"), {
        studentId: studentId,
        courseId: courseId,
        classesAttended: 0,
        totalClassesHeld: totalClassesHeld,
        attendancePercentage: 0,
        lastUpdated: new Date()
      });
    }
  } catch (error) {
    console.error("Error updating attendance for completed classes:", error);
  }
};
    
    // Fetch attendance data from studentCourseAttendance collection
    const fetchAttendanceData = async (userId) => {
      try {
        // Query studentCourseAttendance collection for this student
        const attendanceQuery = query(
          collection(db, "studentCourseAttendance"),
          where("studentId", "==", userId)
        );
        
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceData = [];
        
        // Define an array of colors to cycle through
        const colors = ["#1E90FF", "#9370DB", "#32CD32", "#FF7F50", "#FF6347", "#8A2BE2", "#20B2AA"];
        
        // Process each attendance record
        let colorIndex = 0;
        for (const docSnapshot of attendanceSnapshot.docs) {  // Renamed to docSnapshot
          const data = docSnapshot.data();
          
          // Get course name from courseId
          const courseDoc = await getDoc(doc(db, "courses", data.courseId));  // Now doc is the Firebase function
          let courseName = data.courseId; // Default to courseId if course not found
          
          if (courseDoc.exists()) {
            courseName = courseDoc.data().name || courseDoc.data().code || data.courseId;
          }
          
          attendanceData.push({
            subject: courseName,
            percentage: data.attendancePercentage || 0,
            color: colors[colorIndex % colors.length]
          });
          
          colorIndex++;
        }
        
        // Update state with the attendance data
        setAttendanceSummary(attendanceData);
        
      } catch (error) {
        console.error("Error fetching attendance data:", error);
        // If there's an error, set empty array
        setAttendanceSummary([]);
      }
    };
    // Reset all attendance tracking states
    const resetAttendanceTracking = () => {
      stopAttendanceTimer();
      setAttendanceMode("normal");
      setActiveClass(null);
      setTimer(0);
      if (classListenerRef.current) {
        classListenerRef.current();
        classListenerRef.current = null;
      }
    };

    // Function to fetch classes for a specific course
    const fetchClassesForCourse = async (course) => {
      try {
        setSelectedCourse(course);
        
        const classesQuery = query(
          collection(db, "classes"),  
          where("courseId", "==", course.id)
        );
        
        const classesSnapshot = await getDocs(classesQuery);
        const classesList = [];
        
        classesSnapshot.forEach((doc) => {
          classesList.push({
            id: doc.id,
            ...doc.data(),
            isActive: doc.data().isActive || false
          });
        });
        
        setAvailableClasses(classesList);
        setShowClassesModal(true);
      } catch (error) {
        console.error("Error fetching classes:", error);
        Alert.alert("Error", "Failed to load classes for this course.");
      }
    };

    // Updated function to handle course registration
    const handleRegisterCourse = async (course) => {
      try {
        const user = auth.currentUser;
        
        if (!user) {
          Alert.alert("Error", "You must be logged in to register for courses.");
          return;
        }
        
        // Update user document to add course to enrolledCourses
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          enrolledCourses: arrayUnion(course.id)
        });
        
        // Update course document to add student to enrolledStudents
        const courseRef = doc(db, "courses", course.id);
        await updateDoc(courseRef, {
          enrolledStudents: arrayUnion(user.uid)
        });
        
        // Update all classes for this course to add student to totalStudents
        const classesQuery = query(
          collection(db, "classes"),
          where("courseId", "==", course.id)
        );
        
        const classesSnapshot = await getDocs(classesQuery);
        
        // Create a batch to update all classes at once
        const batch = [];
        classesSnapshot.forEach((classDoc) => {
          const classRef = doc(db, "classes", classDoc.id);
          batch.push(updateDoc(classRef, {
            totalStudents: arrayUnion(user.uid)
          }));
        });
        
        // Execute all batch operations
        await Promise.all(batch);
        
        // Refresh courses data
        fetchCoursesData(user.uid);
        
        // Close registration modal
        setShowRegistrationModal(false);
        
        // Show success message
        Alert.alert("Success", `Successfully registered for ${course.name} (${course.code})`);
        
        // Fetch and show classes for this course
        fetchClassesForCourse(course);
      } catch (error) {
        console.error("Error registering for course:", error);
        Alert.alert("Error", "Failed to register for course. Please try again.");
      }
    };

    // Function to handle sign out
    const handleSignOut = async () => {
      try {
        await signOut(auth);
        navigation.replace(ROUTES.WELCOME);
      } catch (error) {
        console.error("Sign out error:", error);
        Alert.alert("Error", "Failed to sign out. Please try again.");
      }
    };

    // Attendance summary data
    //const attendanceSummary = [
      //{ subject: "Physics", percentage: 87, color: "#1E90FF" },
     // { subject: "Algorithms", percentage: 92, color: "#9370DB" },
     // { subject: "Database", percentage: 79, color: "#32CD32" },
    //];

    // Classroom WiFi Configuration
    const CLASSROOM_WIFI_CONFIG = {
      SSID: "IIIT DHARWAD-STUDENT",
      BSSID: "D4:20:B0:9a:93:a1",
    };

    // Comprehensive Permission Request
    const requestLocationPermission = async () => {
      try {
        if (Platform.OS === "android") {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: "Location Permission for WiFi",
              message: "We need location access to detect WiFi networks",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK",
            }
          );

          // Handle different permission states
          switch (granted) {
            case PermissionsAndroid.RESULTS.GRANTED:
              setPermissionStatus("granted");
              return true;
            case PermissionsAndroid.RESULTS.DENIED:
              setPermissionStatus("denied");
              showPermissionRationaleAlert();
              return false;
            case PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN:
              setPermissionStatus("blocked");
              showOpenSettingsAlert();
              return false;
          }
        }
        return true;
      } catch (err) {
        console.error("Permission Request Error:", err);
        setDebugInfo(`Permission Error: ${err.message}`);
        return false;
      }
    };

    // Alert for Permission Rationale
    const showPermissionRationaleAlert = () => {
      Alert.alert(
        "Location Permission Needed",
        "This app requires location access to detect WiFi networks. Please grant location permission.",
        [
          { text: "OK", onPress: () => requestLocationPermission() },
          { text: "Cancel", style: "cancel" },
        ]
      );
    };

    // Alert to Open App Settings
    const showOpenSettingsAlert = () => {
      Alert.alert(
        "Permission Blocked",
        "Location permission is permanently denied. Please enable it in app settings.",
        [
          { text: "Open Settings", onPress: () => Linking.openSettings() },
          { text: "Cancel", style: "cancel" },
        ]
      );
    };

    // WiFi Connection Check
    const checkWiFiConnection = async () => {
      const hasPermission = await requestLocationPermission();
    
      if (!hasPermission) {
        setWifiConnected(false);
        setDebugInfo("WiFi permissions not granted");
        showWifiWarningNotification(false);
        return;
      }
    
      try {
        const state = await NetInfo.fetch();
    
        if (state.type === "wifi") {
          const ssid = state.details.ssid || "Unknown";
          const bssid = state.details.bssid || "00:00:00:00:00:00";
    
          setCurrentSSID(ssid);
          setCurrentBSSID(bssid);
    
          // Fetch all classrooms
          const classroomsQuery = query(collection(db, "classrooms"));
          const classroomsSnapshot = await getDocs(classroomsQuery);
          
          let isClassroomWiFi = false;
          
          classroomsSnapshot.forEach((doc) => {
            const classroom = doc.data();
            
            // Check if SSID matches and BSSID is in the list of BSSIDs
            if (
              ssid.trim() === classroom.SSID.trim() && 
              (
                // If BSSIDs is an array, use includes
                (Array.isArray(classroom.BSSIDs) && classroom.BSSIDs.some(
                  validBSSID => bssid.toUpperCase() === validBSSID.toUpperCase()
                )) ||
                // If it's a single BSSID string, do direct comparison
                (typeof classroom.BSSID === 'string' && 
                 bssid.toUpperCase() === classroom.BSSID.toUpperCase())
              )
            ) {
              isClassroomWiFi = true;
            }
          });
    
          setWifiConnected(isClassroomWiFi);
          showWifiWarningNotification(!isClassroomWiFi);
    
          // Detailed Debug Information
          setDebugInfo(
            `Network Type: WiFi
            Current SSID: ${ssid}
            Current BSSID: ${bssid}
            Connected to Classroom WiFi: ${isClassroomWiFi}
            Permission Status: ${permissionStatus}`
          );
        } else {
          setWifiConnected(false);
          setDebugInfo("Not connected to WiFi");
          showWifiWarningNotification(true);
        }
      } catch (error) {
        console.error("WiFi Check Error:", error);
        setWifiConnected(false);
        setDebugInfo(`Error: ${error.message}`);
        showWifiWarningNotification(true);
      }
    };

    // Show WiFi warning notification
    const showWifiWarningNotification = (show) => {
      setShowNotification(show);

      if (show) {
        // Auto-hide notification after 5 seconds
        setTimeout(() => {
          setShowNotification(false);
        }, 5000);
      }
    };

    // Start the timer and update student connection status
    const startAttendanceTimer = () => {
      setTimer(0);
      timerRef.current = setInterval(() => {
        setTimer(prevTimer => prevTimer + 1);
      }, 1000);
    };

    // Stop the timer
    const stopAttendanceTimer = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    // Format time for display (MM:SS)
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Join class function
 // Modify the handleJoinClass function to also set courseId
const handleJoinClass = async (classItem) => {
  if (!wifiConnected) {
    Alert.alert(
      "Cannot Join Class",
      "You must be connected to the classroom WiFi to join this class.",
      [{ text: "OK" }]
    );
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    Alert.alert("Error", "You must be logged in to join a class.");
    return;
  }

  try {
    // First disconnect from any existing class
    if (activeClass) {
      await handleDisconnectFromClass();
    }
    
    // Start the attendance tracking process
    setActiveClass({
      ...classItem,
      courseId: classItem.courseId  // Make sure courseId is available
    });
    setAttendanceMode("active");
    
    // Add student to studentsConnected array
    const classRef = doc(db, "classes", classItem.id);
    await updateDoc(classRef, {
      studentsConnected: arrayUnion(user.uid),
      studentsPresent: (classItem.studentsPresent || 0) + 1
    });
    
    // Start the timer
    startAttendanceTimer();
    
    // Set up a real-time listener for this class
    classListenerRef.current = onSnapshot(classRef, (doc) => {
      if (doc.exists()) {
        const classData = doc.data();
        // If class is no longer active, stop the timer and automatically prompt for verification
        if (!classData.isActive && attendanceMode === "active") {
          console.log("Class is no longer active from listener, initiating class ended procedure");
          handleClassEnded();
        }
      } else {
        // Document no longer exists, reset tracking
        console.log("Class document no longer exists");
        resetAttendanceTracking();
      }
    }, (error) => {
      console.error("Error listening to class changes:", error);
    });
  } catch (error) {
    console.error("Error joining class:", error);
    Alert.alert("Error", "Failed to join class. Please try again.");
    resetAttendanceTracking();
  }
};

    // Handle when a class is ended by the professor
// Update the handleClassEnded function
// Update the handleClassEnded function
const handleClassEnded = async () => {
  if (attendanceMode !== "active") return;
  
  try {
    // Stop the timer
    stopAttendanceTimer();
    
    const user = auth.currentUser;
    if (!user || !activeClass) return;
    
    // Student's duration is in seconds (directly from timer)
    const studentDurationSeconds = timer;
    
    // Get the actual class duration from the database
    const classDoc = await getDoc(doc(db, "classes", activeClass.id));
    if (!classDoc.exists()) {
      throw new Error("Class no longer exists");
    }
    
    // Class duration is in seconds (from the professor)
    const classDurationSeconds = classDoc.data().duration || 5400; // Default to 90 minutes (5400 seconds) if not set
    const requiredDurationSeconds = Math.floor((2/3) * classDurationSeconds);
    
    // Check if student meets the duration requirement (comparing seconds with seconds)
    const attendanceMet = studentDurationSeconds >= requiredDurationSeconds;
    
    // Calculate minutes for storage and display
    const studentDurationMinutes = Math.floor(studentDurationSeconds / 60);
    
    // First, update the attendance mode but DON'T disconnect yet
    // This keeps the disconnect button visible
    if (attendanceMet) {
      setAttendanceMode("verify");
      
      // Show an alert to get the user's attention
      Alert.alert(
        "Class Ended",
        "The class has ended. You have met the minimum duration requirement. Please verify your attendance now.",
        [
          { 
            text: "Verify Attendance", 
            onPress: () => handleVerify() 
          }
        ],
        { cancelable: false }
      );
    } else {
      // Display required duration in minutes for user-friendly message
      const requiredDurationMinutes = Math.floor(requiredDurationSeconds / 60);
      
      // If student doesn't meet duration requirement
      Alert.alert(
        "Attendance Requirement Not Met",
        `You need to attend at least ${requiredDurationMinutes} minutes of the class to qualify for attendance.`,
        [
          {
            text: "OK",
            onPress: () => handleDisconnectFromClass() // Call disconnect to properly record absence
          }
        ]
      );
    }
  } catch (error) {
    console.error("Error handling class ended:", error);
    Alert.alert("Error", "An error occurred when processing class end.");
    resetAttendanceTracking();
  }
};

    // Explicitly disconnect from a class
// Replace the existing handleDisconnectFromClass function with this one
const handleDisconnectFromClass = async () => {
  if (!activeClass) return;
  
  try {
    const user = auth.currentUser;
    if (!user) return;
    
    // Student's duration is in seconds (directly from timer)
    const studentDurationSeconds = timer;
    
    // Get the actual class duration from the database
    const classDoc = await getDoc(doc(db, "classes", activeClass.id));
    if (!classDoc.exists()) {
      throw new Error("Class no longer exists");
    }
    
    // Class duration is in seconds (from the professor)
    const classDurationSeconds = classDoc.data().duration || 5400; // Default to 90 minutes (5400 seconds) if not set
    const requiredDurationSeconds = Math.floor((2/3) * classDurationSeconds);
    
    // Check if student meets the duration requirement (comparing seconds with seconds)
    const attendanceMet = studentDurationSeconds >= requiredDurationSeconds;
    
    // For recording in the database, convert seconds to minutes
    const studentDurationMinutes = Math.floor(studentDurationSeconds / 60);
    
    // If attendance requirement is met, prompt for biometric verification
    if (attendanceMet) {
      const rnBiometrics = new ReactNativeBiometrics();
      
      // Check if device supports biometrics
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      
      if (available) {
        // Prompt for fingerprint verification
        const { success } = await rnBiometrics.simplePrompt({
          promptMessage: 'Verify fingerprint to confirm attendance',
          cancelButtonText: 'Cancel'
        });
        
        // Update the studentAttendance collection
        const attendanceRef = collection(db, "studentAttendance");
        await addDoc(attendanceRef, {
          studentId: user.uid,
          classId: activeClass.id,
          courseId: activeClass.courseId,
          date: new Date(),
          joinTime: new Date(Date.now() - (timer * 1000)), // Calculate when they joined
          leaveTime: new Date(),
          studentDuration: studentDurationMinutes, // Store in minutes for consistency with other records
          attendanceMet: attendanceMet,
          bioVerified: success,
          isPresent: attendanceMet && success
        });
        
        // Update studentCourseAttendance if biometric verification is successful
        if (success) {
          // Get the actual count of classes for this course
          const classesQuery = query(
            collection(db, "classes"),
            where("courseId", "==", activeClass.courseId)
          );
          const classesSnapshot = await getDocs(classesQuery);
          const totalClassesHeld = classesSnapshot.size; // This gives the total count of classes for the course
          
          // Query to check if entry already exists
          const courseAttendanceQuery = query(
            collection(db, "studentCourseAttendance"),
            where("studentId", "==", user.uid),
            where("courseId", "==", activeClass.courseId)
          );
          
          const courseAttendanceSnapshot = await getDocs(courseAttendanceQuery);
          
          if (courseAttendanceSnapshot.empty) {
            // Create new record if doesn't exist
            await addDoc(collection(db, "studentCourseAttendance"), {
              studentId: user.uid,
              courseId: activeClass.courseId,
              classesAttended: 1,
              totalClassesHeld: totalClassesHeld,
              attendancePercentage: Math.round((1 / totalClassesHeld) * 100),
              lastUpdated: new Date()
            });
          } else {
            // Update existing record
            const docRef = doc(db, "studentCourseAttendance", courseAttendanceSnapshot.docs[0].id);
            const currentData = courseAttendanceSnapshot.docs[0].data();
            
            const classesAttended = currentData.classesAttended + 1;
            const attendancePercentage = Math.round((classesAttended / totalClassesHeld) * 100);
            
            await updateDoc(docRef, {
              classesAttended: classesAttended,
              totalClassesHeld: totalClassesHeld,
              attendancePercentage: attendancePercentage,
              lastUpdated: new Date()
            });
          }
          
          // Show success message
          Alert.alert("Success", "Attendance recorded successfully!");
        } else {
          // User canceled or failed biometric verification
          Alert.alert("Verification Failed", "Biometric verification failed. Attendance not recorded.");
        }
      } else {
        // Device doesn't support biometrics
        Alert.alert(
          "Biometrics Not Available",
          "Your device doesn't support biometric authentication. Attendance cannot be recorded."
        );
      }
    } else {
      // Display required duration in minutes for user-friendly message
      const requiredDurationMinutes = Math.floor(requiredDurationSeconds / 60);
      
      // If student doesn't meet duration requirement
      Alert.alert(
        "Attendance Requirement Not Met",
        `You need to attend at least ${requiredDurationMinutes} minutes of the class to qualify for attendance. You will be marked as absent.`
      );
      
      // Still record the attempt in studentAttendance
      const attendanceRef = collection(db, "studentAttendance");
      await addDoc(attendanceRef, {
        studentId: user.uid,
        classId: activeClass.id,
        courseId: activeClass.courseId,
        date: new Date(),
        joinTime: new Date(Date.now() - (timer * 1000)),
        leaveTime: new Date(),
        studentDuration: studentDurationMinutes,
        attendanceMet: false,
        bioVerified: false,
        isPresent: false
      });
      
      // Ensure absence is properly recorded in studentCourseAttendance
      // First check if there's an existing record
      const courseAttendanceQuery = query(
        collection(db, "studentCourseAttendance"),
        where("studentId", "==", user.uid),
        where("courseId", "==", activeClass.courseId)
      );
      
      const courseAttendanceSnapshot = await getDocs(courseAttendanceQuery);
      
      // Get the total classes for this course
      const classesQuery = query(
        collection(db, "classes"),
        where("courseId", "==", activeClass.courseId)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const totalClassesHeld = classesSnapshot.size;
      
      if (courseAttendanceSnapshot.empty) {
        // Create new record with zero attendance for this class
        await addDoc(collection(db, "studentCourseAttendance"), {
          studentId: user.uid,
          courseId: activeClass.courseId,
          classesAttended: 0,
          totalClassesHeld: totalClassesHeld,
          attendancePercentage: 0,
          lastUpdated: new Date()
        });
      } else {
        // Update existing record - only update totalClassesHeld (don't increment classesAttended)
        const docRef = doc(db, "studentCourseAttendance", courseAttendanceSnapshot.docs[0].id);
        const currentData = courseAttendanceSnapshot.docs[0].data();
        
        const classesAttended = currentData.classesAttended; // No change in attended classes
        const attendancePercentage = Math.round((classesAttended / totalClassesHeld) * 100);
        
        await updateDoc(docRef, {
          totalClassesHeld: totalClassesHeld,
          attendancePercentage: attendancePercentage,
          lastUpdated: new Date()
        });
      }
      
      // Add student to absentStudents array if it exists
      const classRef = doc(db, "classes", activeClass.id);
      try {
        await updateDoc(classRef, {
          absentStudents: arrayUnion(user.uid)
        });
      } catch (e) {
        // If absentStudents array doesn't exist, we can ignore this error
        console.log("Note: absentStudents array may not exist in class document");
      }
    }
    
    // Remove student from studentsConnected array
    const classRef = doc(db, "classes", activeClass.id);
    await updateDoc(classRef, {
      studentsConnected: arrayRemove(user.uid),
      studentsPresent: Math.max(0, (activeClass.studentsPresent || 1) - 1)
    });
    
    // Reset tracking states
    resetAttendanceTracking();
    
  } catch (error) {
    console.error("Error disconnecting from class:", error);
    Alert.alert("Error", "Failed to disconnect: " + error.message);
    resetAttendanceTracking();
  }
};
    // Handle verification process
// Update the handleVerify function
const handleVerify = async () => {
  try {
    const user = auth.currentUser;
    if (!user || !activeClass) {
      return;
    }
    
    const rnBiometrics = new ReactNativeBiometrics();
    
    // Check if device supports biometrics
    const { available } = await rnBiometrics.isSensorAvailable();
    
    if (available) {
      // Prompt for fingerprint verification
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Verify fingerprint to confirm attendance',
        cancelButtonText: 'Cancel'
      });
      
      const studentDuration = Math.floor(timer / 60);
      
      // Update the studentAttendance collection
      const attendanceRef = collection(db, "studentAttendance");
      await addDoc(attendanceRef, {
        studentId: user.uid,
        classId: activeClass.id,
        courseId: activeClass.courseId,
        date: new Date(),
        joinTime: new Date(Date.now() - (timer * 1000)),
        leaveTime: new Date(),
        studentDuration: studentDuration,
        attendanceMet: true,
        bioVerified: success,
        isPresent: success
      });
      
      if (success) {
        // Update studentCourseAttendance
        const courseAttendanceQuery = query(
          collection(db, "studentCourseAttendance"),
          where("studentId", "==", user.uid),
          where("courseId", "==", activeClass.courseId)
        );
        
        const courseAttendanceSnapshot = await getDocs(courseAttendanceQuery);
        
        const classesQuery = query(
          collection(db, "classes"),
          where("courseId", "==", activeClass.courseId)
        );
        const classesSnapshot = await getDocs(classesQuery);
        const totalClassesHeld = classesSnapshot.size; // This gives you the count of all classes for this course
        
        if (courseAttendanceSnapshot.empty) {
          // Create new record if doesn't exist
          await addDoc(collection(db, "studentCourseAttendance"), {
            studentId: user.uid,
            courseId: activeClass.courseId,
            classesAttended: 1,
            totalClassesHeld: totalClassesHeld,
            attendancePercentage: 100,
            lastUpdated: new Date()
          });
        } else {
          // Update existing record
          const docRef = doc(db, "studentCourseAttendance", courseAttendanceSnapshot.docs[0].id);
          const currentData = courseAttendanceSnapshot.docs[0].data();
          
          const classesAttended = currentData.classesAttended + 1;
          const attendancePercentage = Math.round((classesAttended / totalClassesHeld) * 100);
          
          await updateDoc(docRef, {
            classesAttended: classesAttended,
            totalClassesHeld: totalClassesHeld,
            attendancePercentage: attendancePercentage,
            lastUpdated: new Date()
          });
        }
        
        // Add student to verifiedStudents array to mark them as having attended
        const classRef = doc(db, "classes", activeClass.id);
        await updateDoc(classRef, {
          verifiedStudents: arrayUnion(user.uid)
        });
        
        // Show success message
        setAttendanceMode("success");
        
        // Auto-close success message after 2 seconds
        setTimeout(() => {
          resetAttendanceTracking();
        }, 2000);
      } else {
        // User canceled or failed biometric verification
        Alert.alert(
          "Verification Failed", 
          "Biometric verification failed. Attendance not recorded.",
          [{ text: "OK", onPress: () => resetAttendanceTracking() }]
        );
      }
    } else {
      // Device doesn't support biometrics
      Alert.alert(
        "Biometrics Not Available",
        "Your device doesn't support biometric authentication. Attendance cannot be recorded.",
        [{ text: "OK", onPress: () => resetAttendanceTracking() }]
      );
    }
  } catch (error) {
    console.error("Error verifying attendance:", error);
    Alert.alert("Error", "Failed to verify attendance. Please try again.");
    resetAttendanceTracking();
  }
};

    // Navigate to view attendance
    const handleViewAttendance = () => {
      navigation.navigate(ROUTES.VIEW_ATTENDANCE);
    };

    // Navigate to Schedule
    const handleNavigateToSchedule = () => {
      navigation.navigate("Schedule", { upcomingClasses: registeredCourses });
    };

    const handleNavigateToCourses = () => {
      navigation.navigate("Courses", { 
        courses: registeredCourses.map(course => course.subject) 
      });
    };

    // Navigate to Profile
    const handleNavigateToProfile = () => {
      navigation.navigate("Profile", { studentName, studentId });
    };

    // Periodic WiFi Check
    useEffect(() => {
      checkWiFiConnection();
      const intervalId = setInterval(checkWiFiConnection, 5000);
      return () => clearInterval(intervalId);
    }, []);

    if (isLoading) {
      return (
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <Text>Loading...</Text>
        </View>
      );
    }

    // Return "No classes today" if no registered courses
    const renderUpcomingClasses = () => {
      if (registeredCourses.length === 0) {
        return (
          <View style={styles.emptyStateContainer}>
            <MaterialIcons name="event-busy" size={48} color="#CCCCCC" />
            <Text style={styles.emptyStateText}>No classes registered yet</Text>
            <Text style={styles.emptyStateSubText}>Register for courses below</Text>
          </View>
        );
      }

      return registeredCourses.map((classItem) => (
        <TouchableOpacity
          key={classItem.id}
          style={[
            styles.classCard,
            classItem.isActive && styles.activeClassCard,
            activeClass && activeClass.id === classItem.id && attendanceMode === "active" && styles.attendingClassCard
          ]}
          onPress={() => classItem.isActive && wifiConnected && handleJoinClass(classItem)}
          disabled={!classItem.isActive || !wifiConnected || (activeClass && activeClass.id === classItem.id)}
        >
          <View style={styles.classInfo}>
            <Text style={styles.classTime}>{classItem.time}</Text>
            <Text style={styles.classSubject}>
              {classItem.subject} ({classItem.code})
            </Text>
            <Text style={styles.classProfessor}>
              {classItem.professor} • {classItem.room}
            </Text>
            <Text style={styles.classDate}>Date: {classItem.date}</Text>
            {classItem.isActive && (
              <View style={styles.activeIndicator}>
                <Text style={styles.activeIndicatorText}>Class is Active</Text>
              </View>
            )}
            {activeClass && activeClass.id === classItem.id && attendanceMode === "active" && (
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>Connected: {formatTime(timer)}</Text>
              </View>
            )}
          </View>
          <View style={styles.classActions}>
            {activeClass && activeClass.id === classItem.id && attendanceMode === "active" ? (
              <TouchableOpacity
                style={[styles.joinButton, styles.disconnectButton]}
                onPress={handleDisconnectFromClass}
              >
                <Text style={styles.joinButtonText}>DISCONNECT</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.joinButton,
                  !wifiConnected || !classItem.isActive ? styles.disabledButton : null,
                ]}
                onPress={() => handleJoinClass(classItem)}
                disabled={!wifiConnected || !classItem.isActive}
              >
                <Text style={styles.joinButtonText}>
                  {classItem.isActive ? "JOIN" : "UPCOMING"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      ));
    };

    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#4169E1" barStyle="light-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Welcome {studentName}</Text>
              <View style={styles.wifiStatusContainer}>
                <View
                  style={[
                    styles.wifiStatusDot,
                    attendanceMode === "active"
                      ? styles.tracking
                      : wifiConnected
                      ? styles.connected
                      : styles.disconnected,
                  ]}
                />
                <Text style={styles.wifiStatusText}>
                  {attendanceMode === "active"
                    ? "Currently Tracking"
                    : wifiConnected
                    ? "Wi-Fi Connected"
                    : "Wi-Fi Not Connected"}
                </Text>
              </View>
            </View>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{studentName ? studentName.charAt(0) : "S"}</Text>
            </View>
          </View>
        </View>
        
        {/* Main Content */}
        <ScrollView style={styles.content}>
          {/* Upcoming Classes Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Classes</Text>
            <Text style={styles.todayText}>Today</Text>
          </View>

          {/* Render registered courses or empty state */}
          {renderUpcomingClasses()}

          {/* Course Registration Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Course Registration</Text>
          </View>
          
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => setShowRegistrationModal(true)}
          >
            <MaterialIcons name="add-circle-outline" size={20} color="white" style={styles.registerIcon} />
            <Text style={styles.registerButtonText}>REGISTER TO COURSE</Text>
          </TouchableOpacity>

          {/* Attendance Summary */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Attendance Summary</Text>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryBoxes}>
                {attendanceSummary.map((item, index) => (
                  <View
                    key={index}
                    style={[
                      styles.summaryBox,
                      { backgroundColor: `${item.color}10` },
                    ]}
                  >
                    <Text
                      style={[styles.summaryPercentage, { color: item.color }]}
                    >
                      {item.percentage}%
                    </Text>
                    <Text style={styles.summarySubject}>{item.subject}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* View Attendance Button */}
          <TouchableOpacity
            style={styles.viewAttendanceButton}
            onPress={handleViewAttendance}
          >
            <Text style={styles.actionButtonText}>VIEW MY ATTENDANCE</Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <Text style={styles.actionButtonText}>LOGOUT</Text>
          </TouchableOpacity>

          {/* Debug Information (can be hidden in production) */}
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Debug Information</Text>
              <Text style={styles.debugText}>{debugInfo}</Text>
            </View>
          )}
        </ScrollView>

        {/* Course Registration Modal */}
        <Modal
          visible={showRegistrationModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowRegistrationModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Available Courses</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowRegistrationModal(false)}
                >
                  <MaterialIcons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {availableCourses.length === 0 ? (
                  <View style={styles.emptyStateContainer}>
                    <MaterialIcons name="school" size={48} color="#CCCCCC" />
                    <Text style={styles.emptyStateText}>No available courses</Text>
                    <Text style={styles.emptyStateSubText}>You're registered for all courses</Text>
                  </View>
                ) : (
                  availableCourses.map((course) => (
                    <TouchableOpacity
                      key={course.id}
                      style={styles.courseItem}
                      onPress={() => handleRegisterCourse(course)}
                    >
                      <View style={styles.courseInfo}>
                        <Text style={styles.courseCode}>{course.code}</Text>
                        <Text style={styles.courseName}>{course.name}</Text>
                      </View>
                      <MaterialIcons name="add-circle" size={24} color="#4169E1" />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Classes Modal */}
        <Modal
          visible={showClassesModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowClassesModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedCourse ? `Classes for ${selectedCourse.name}` : 'Classes'}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowClassesModal(false)}
                >
                  <MaterialIcons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {availableClasses.length === 0 ? (
                  <View style={styles.emptyStateContainer}>
                    <MaterialIcons name="event-busy" size={48} color="#CCCCCC" />
                    <Text style={styles.emptyStateText}>No classes available</Text>
                    <Text style={styles.emptyStateSubText}>This course has no scheduled classes</Text>
                  </View>
                ) : (
                  availableClasses.map((classItem) => (
                    <View key={classItem.id} style={styles.classItem}>
                      <View style={styles.classInfo}>
                        <Text style={styles.classTime}>{classItem.time || 'TBD'}</Text>
                        <Text style={styles.classDate}>{classItem.date || 'TBD'}</Text>
                        <Text style={styles.classRoom}>Room {classItem.roomNumber || 'TBD'}</Text>
                      </View>
                      {classItem.isActive && (
                        <View style={styles.activeClassBadge}>
                          <Text style={styles.activeClassText}>Active</Text>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowClassesModal(false)}
              >
                <Text style={styles.closeModalButtonText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* WiFi Connection Notification */}
        {showNotification && (
          <View style={styles.notification}>
            <MaterialIcons name="wifi-off" size={20} color="white" />
            <Text style={styles.notificationText}>
              Connect to classroom WiFi to track attendance
            </Text>
          </View>
        )}

        {/* Verify Attendance Modal */}
        {attendanceMode === "verify" && (
          <View style={styles.verifyContainer}>
            <View style={styles.verifyContent}>
              <MaterialIcons name="check-circle" size={48} color="#4169E1" />
              <Text style={styles.verifyTitle}>Class Ended</Text>
              <Text style={styles.verifyText}>
                Please verify your attendance for:
              </Text>
              <Text style={styles.verifyClass}>
                {activeClass ? activeClass.subject : "Current Class"}
              </Text>
              <TouchableOpacity style={styles.verifyButton} onPress={handleVerify}>
                <Text style={styles.verifyButtonText}>VERIFY ATTENDANCE</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Success Modal */}
        {attendanceMode === "success" && (
          <View style={styles.verifyContainer}>
            <View style={styles.verifyContent}>
              <MaterialIcons name="verified" size={48} color="#32CD32" />
              <Text style={styles.verifyTitle}>Attendance Verified</Text>
              <Text style={styles.verifyText}>
                Your attendance has been successfully recorded.
              </Text>
            </View>
          </View>
        )}
        
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navItem} onPress={() => {}}>
            <MaterialIcons name="home" size={24} color="#4169E1" />
            <Text style={[styles.navText, { color: "#4169E1" }]}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem} onPress={handleNavigateToSchedule}>
            <MaterialIcons name="calendar-today" size={24} color="#888" />
            <Text style={styles.navText}>Schedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem} onPress={handleNavigateToCourses}>
            <MaterialIcons name="book" size={24} color="#888" />
            <Text style={styles.navText}>Courses</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem} onPress={handleNavigateToProfile}>
            <MaterialIcons name="person" size={24} color="#888" />
            <Text style={styles.navText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Styles
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#F5F5F5",
    },
    header: {
      backgroundColor: "#4169E1",
      paddingTop: 48,
      paddingBottom: 16,
      paddingHorizontal: 16,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      elevation: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "white",
      marginBottom: 8,
    },
    headerContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    welcomeText: {
      fontSize: 22,
      fontWeight: "bold",
      color: "white",
    },
    wifiStatusContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
    },
    wifiStatusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },
    connected: {
      backgroundColor: "#32CD32",
    },
    disconnected: {
      backgroundColor: "#FF6347",
    },
    tracking: {
      backgroundColor: "#FFD700",
    },
    wifiStatusText: {
      color: "white",
      fontSize: 12,
    },
    avatarContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "white",
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#4169E1",
    },
    content: {
      flex: 1,
      padding: 16,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginVertical: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#333",
    },
    todayText: {
      fontSize: 14,
      color: "#666",
    },
    classCard: {
      backgroundColor: "white",
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      elevation: 2,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    activeClassCard: {
      borderLeftWidth: 4,
      borderLeftColor: "#32CD32",
    },
    attendingClassCard: {
      borderLeftWidth: 4,
      borderLeftColor: "#FFD700",
      backgroundColor: "#FFFAF0",
    },
    classInfo: {
      flex: 1,
    },
    classTime: {
      fontSize: 14,
      color: "#4169E1",
      fontWeight: "bold",
    },
    classSubject: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#333",
      marginTop: 2,
    },
    classProfessor: {
      fontSize: 12,
      color: "#666",
      marginTop: 2,
    },
    classDate: {
      fontSize: 12,
      color: "#888",
      marginTop: 4,
    },
    classActions: {
      justifyContent: "center",
    },
    joinButton: {
      backgroundColor: "#4169E1",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    disconnectButton: {
      backgroundColor: "#FF6347",
    },
    disabledButton: {
      backgroundColor: "#CCCCCC",
    },
    joinButtonText: {
      color: "white",
      fontWeight: "bold",
      fontSize: 12,
    },
    activeIndicator: {
      backgroundColor: "#E8F5E9",
      padding: 4,
      borderRadius: 4,
      marginTop: 8,
      alignSelf: "flex-start",
    },
    activeIndicatorText: {
      color: "#32CD32",
      fontSize: 10,
      fontWeight: "bold",
    },
    timerContainer: {
      marginTop: 8,
    },
    timerText: {
      color: "#FF8C00",
      fontWeight: "bold",
      fontSize: 12,
    },
    emptyStateContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: "white",
      borderRadius: 12,
      marginVertical: 16,
    },
    emptyStateText: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#666",
      marginTop: 12,
    },
    emptyStateSubText: {
      fontSize: 14,
      color: "#888",
      marginTop: 4,
    },
    registerButton: {
      backgroundColor: "#4169E1",
      borderRadius: 8,
      paddingVertical: 12,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    registerIcon: {
      marginRight: 8,
    },
    registerButtonText: {
      color: "white",
      fontWeight: "bold",
    },
    summarySection: {
      marginTop: 16,
    },
    summaryContainer: {
      backgroundColor: "white",
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
    },
    summaryBoxes: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    summaryBox: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      margin: 4,
      alignItems: "center",
    },
    summaryPercentage: {
      fontSize: 18,
      fontWeight: "bold",
    },
    summarySubject: {
      fontSize: 12,
      color: "#666",
      marginTop: 4,
    },
    viewAttendanceButton: {
      backgroundColor: "#4169E1",
      borderRadius: 8,
      paddingVertical: 14,
      marginTop: 16,
      alignItems: "center",
    },
    logoutButton: {
      backgroundColor: "#FF6347",
      borderRadius: 8,
      paddingVertical: 14,
      marginTop: 16,
      marginBottom: 32,
      alignItems: "center",
    },
    actionButtonText: {
      color: "white",
      fontWeight: "bold",
    },
    debugContainer: {
      marginTop: 16,
      padding: 12,
      backgroundColor: "#F0F0F0",
      borderRadius: 8,
    },
    debugTitle: {
      fontWeight: "bold",
      marginBottom: 4,
    },
    debugText: {
      fontSize: 12,
      color: "#666",
    },
    notification: {
      position: "absolute",
      top: 100,
      left: 16,
      right: 16,
      backgroundColor: "#FF6347",
      borderRadius: 8,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      elevation: 4,
    },
    notificationText: {
      color: "white",
      marginLeft: 8,
      flex: 1,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: "white",
      borderRadius: 12,
      width: "90%",
      maxHeight: "80%",
      padding: 16,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#333",
    },
    closeButton: {
      padding: 4,
    },
    modalScroll: {
      maxHeight: 400,
    },
    courseItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#EEEEEE",
    },
    courseInfo: {
      flex: 1,
    },
    courseCode: {
      fontSize: 14,
      color: "#4169E1",
      fontWeight: "bold",
    },
    courseName: {
      fontSize: 16,
      color: "#333",
      marginTop: 2,
    },
    classItem: {
      backgroundColor: "#F8F8F8",
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    activeClassBadge: {
      backgroundColor: "#E8F5E9",
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
    },
    activeClassText: {
      color: "#32CD32",
      fontSize: 12,
      fontWeight: "bold",
    },
    classRoom: {
      fontSize: 12,
      color: "#666",
      marginTop: 2,
    },
    closeModalButton: {
      backgroundColor: "#4169E1",
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 16,
    },
    closeModalButtonText: {
      color: "white",
      fontWeight: "bold",
    },
    verifyContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.7)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999,
    },
    verifyContent: {
      backgroundColor: "white",
      borderRadius: 16,
      padding: 24,
      width: "80%",
      alignItems: "center",
    },
    verifyTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#333",
      marginTop: 16,
    },
    verifyText: {
      fontSize: 14,
      color: "#666",
      marginTop: 8,
      textAlign: "center",
    },
    verifyClass: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#4169E1",
      marginTop: 8,
      marginBottom: 16,
    },
    verifyButton: {
      backgroundColor: "#4169E1",
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      marginTop: 16,
    },
    verifyButtonText: {
      color: "white",
      fontWeight: "bold",
    },
    navBar: {
      flexDirection: "row",
      backgroundColor: "white",
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: "#EEEEEE",
      elevation: 8,
    },
    navItem: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 4,
    },
    navText: {
      fontSize: 12,
      color: "#888",
      marginTop: 4,
    },
  });