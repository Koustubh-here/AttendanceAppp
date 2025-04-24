import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  BackHandler,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getAuth, signOut } from "firebase/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialIcons";
import { doc, getDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, Timestamp, increment, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { ROUTES } from "../navigation/AppNavigator";
import { Picker } from "@react-native-picker/picker";

const ProfessorDashboard = () => {
  const navigation = useNavigation();
  const [professorName, setProfessorName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [classActive, setClassActive] = useState(false);
  const [activeTime, setActiveTime] = useState(0);
  const [activeTimer, setActiveTimer] = useState(null);
  const [courses, setCourses] = useState([]); // Courses the professor teaches
  const [classrooms, setClassrooms] = useState([]); // Available classrooms
  const [classes, setClasses] = useState([]); // Today's classes

  // Modal states for adding a new class
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  
  // State for delete confirmation modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  
  // New state for student list modal
  const [studentsModalVisible, setStudentsModalVisible] = useState(false);
  const [enrolledStudentsList, setEnrolledStudentsList] = useState([]);
  const [averageAttendance, setAverageAttendance] = useState("0");
  const [totalRegisteredStudents, setTotalRegisteredStudents] = useState(0);

  const auth = getAuth();

  // Handle back button press
  useFocusEffect(
    useCallback(() => {
      // Prevent going back to welcome screen
      const onBackPress = () => {
        return true; // Return true to prevent default behavior
      };
  
      // Add back button listener - store the return value
      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
  
      // Clean up using the returned subscription
      return () => backHandler.remove();
      // Or simply: return backHandler.remove;
    }, [])
  );

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
  
        if (user) {
          // Fetch professor's name
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
  
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setProfessorName(userData.name);
  
            // Fetch courses the professor teaches
            const coursesRef = collection(db, "courses");
            const coursesSnapshot = await getDocs(coursesRef);
            const coursesData = coursesSnapshot.docs
              .filter((doc) => doc.data().professorId === user.uid) // Filter courses by professorId
              .map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
            setCourses(coursesData);
            
            // Calculate total registered students across all courses
            let totalStudents = 0;
            for (const course of coursesData) {
              if (course.enrolledStudents && Array.isArray(course.enrolledStudents)) {
                totalStudents += course.enrolledStudents.length;
              }
            }
            setTotalRegisteredStudents(totalStudents);
            
            // Fetch student attendance data for average calculation
            let totalAttendanceSum = 0;
            let totalAttendanceCount = 0;
            
            for (const course of coursesData) {
              if (course.enrolledStudents && Array.isArray(course.enrolledStudents)) {
                // For each enrolled student, fetch their attendance
                for (const studentId of course.enrolledStudents) {
                  const attendanceRef = collection(db, "studentCourseAttendance");
                  const q = query(
                    attendanceRef, 
                    where("studentId", "==", studentId),
                    where("courseId", "==", course.id)
                  );
                  
                  const attendanceSnapshot = await getDocs(q);
                  
                  attendanceSnapshot.forEach(doc => {
                    const attendanceData = doc.data();
                    if (attendanceData.attendancePercentage !== undefined) {
                      totalAttendanceSum += attendanceData.attendancePercentage;
                      totalAttendanceCount++;
                    }
                  });
                }
              }
            }
            
            // Calculate and set average attendance
            if (totalAttendanceCount > 0) {
              const avgAttendance = (totalAttendanceSum / totalAttendanceCount).toFixed(1);
              setAverageAttendance(avgAttendance);
            }
  
            // Fetch available classrooms
            const classroomsRef = collection(db, "classrooms");
            const classroomsSnapshot = await getDocs(classroomsRef);
            const classroomsData = classroomsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setClassrooms(classroomsData);
  
            // Fetch all upcoming classes (today and future)
            const classesRef = collection(db, "classes");
            const classesSnapshot = await getDocs(classesRef);
            const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format
            
            const classesData = classesSnapshot.docs
              .filter(
                (doc) =>
                  doc.data().professorId === user.uid &&
                  doc.data().date >= today && // Include today and future dates
                  !doc.data().completed // Only include classes that are not completed
              )
              .map((doc) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  active: data.isActive || false,
                };
              });
            
            // Check if any class is active and set the timer accordingly
            const activeClassData = classesData.find((cls) => cls.active);
            if (activeClassData) {
              setClassActive(true);
              // Calculate the elapsed time if startTime exists
              if (activeClassData.startTime) {
                const startTime = activeClassData.startTime.toDate ? 
                  activeClassData.startTime.toDate() : 
                  new Date(activeClassData.startTime);
                const elapsedSeconds = Math.floor((new Date() - startTime) / 1000);
                setActiveTime(elapsedSeconds);
              }
            }
            
            // Sort classes by date and time
            classesData.sort((a, b) => {
              if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
              }
              return a.time.localeCompare(b.time);
            });
            
            setClasses(classesData);
          } else {
            navigation.replace(ROUTES.WELCOME);
          }
        } else {
          navigation.replace(ROUTES.WELCOME);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        Alert.alert("Error", "Failed to fetch data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchData();
  }, []);

  // Timer for active class
  useEffect(() => {
    if (classActive) {
      const timer = setInterval(() => {
        setActiveTime((prevTime) => prevTime + 1);
      }, 1000);
      setActiveTimer(timer);
    } else {
      if (activeTimer) {
        clearInterval(activeTimer);
        setActiveTime(0);
      }
    }

    return () => {
      if (activeTimer) {
        clearInterval(activeTimer);
      }
    };
  }, [classActive]);

  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Today";
    
    const today = new Date().toISOString().split("T")[0];
    if (dateString === today) return "Today";
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace(ROUTES.WELCOME);
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };

  // Toggle class active state
  const toggleClassActive = async (classId) => {
    try {
      setIsLoading(true);
      const classToUpdate = classes.find((cls) => cls.id === classId);
      
      if (!classToUpdate) {
        console.error("Class not found");
        return;
      }
      
      const classDocRef = doc(db, "classes", classId);
      
      if (!classToUpdate.active) {
        // Start the class
        await updateDoc(classDocRef, {
          isActive: true,
          startTime: Timestamp.now(),
          endTime: null, // Clear the end time
        });
        
        // Update local state
        setClasses((prevClasses) =>
          prevClasses.map((cls) =>
            cls.id === classId ? { ...cls, active: true } : cls
          )
        );
        setClassActive(true);
        setActiveTime(0);
      } else {
        // Class is ending
        const now = Timestamp.now();
        let durationInSeconds = 0;
        
        // Safely calculate duration if startTime exists
        if (classToUpdate.startTime) {
          // Handle different possible formats of startTime
          const startTimeDate = classToUpdate.startTime instanceof Timestamp 
            ? classToUpdate.startTime.toDate() 
            : (classToUpdate.startTime.toDate 
                ? classToUpdate.startTime.toDate() 
                : new Date(classToUpdate.startTime));
                
          durationInSeconds = Math.floor((now.toDate() - startTimeDate) / 1000);
        } else {
          // If no startTime, use activeTime from state as fallback
          durationInSeconds = activeTime;
        }
        
        // End the class and mark as completed
        await updateDoc(classDocRef, {
          isActive: false,
          endTime: now,
          duration: durationInSeconds,
          completed: true
        });
        
        // Increment totalClassesHeld in the course document
        const courseDocRef = doc(db, "courses", classToUpdate.courseId);
        await updateDoc(courseDocRef, {
          totalClassesHeld: increment(1)
        });
        
        // Update local state - remove this class from the list
        setClasses((prevClasses) => prevClasses.filter(cls => cls.id !== classId));
        
        setClassActive(false);
        
        // Show success message
        Alert.alert(
          "Success", 
          "Class ended successfully! The class has been moved to completed classes."
        );
      }
    } catch (error) {
      console.error("Error toggling class active state: ", error);
      Alert.alert("Error", "Failed to update class status. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show delete confirmation modal
  const showDeleteConfirmation = (classId) => {
    setClassToDelete(classId);
    setDeleteModalVisible(true);
  };

  // Handle deleting a class
  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    
    try {
      setIsLoading(true);
      
      // Check if the class being deleted is active
      const activeClass = classes.find(cls => cls.id === classToDelete && cls.active);
      if (activeClass) {
        // End the active class
        setClassActive(false);
        if (activeTimer) {
          clearInterval(activeTimer);
          setActiveTime(0);
        }
      }
      
      // Delete from Firestore
      await deleteDoc(doc(db, "classes", classToDelete));
      
      // Update local state
      setClasses(prevClasses => prevClasses.filter(cls => cls.id !== classToDelete));
      
      // Close modal and reset
      setDeleteModalVisible(false);
      setClassToDelete(null);
      
      Alert.alert("Success", "Class deleted successfully!");
    } catch (error) {
      console.error("Error deleting class:", error);
      Alert.alert("Error", "Failed to delete class. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle adding a new class
  const handleAddClass = async () => {
    if (!selectedCourse || !selectedClassroom || !selectedTime) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
  
    try {
      setIsLoading(true);
  
      // Get selected course and classroom details
      const selectedCourseData = courses.find(
        (course) => course.id === selectedCourse
      );
      const selectedClassroomData = classrooms.find(
        (classroom) => classroom.id === selectedClassroom
      );
  
      // Create new class object
      const newClass = {
        professorId: auth.currentUser.uid,
        courseId: selectedCourse,
        courseName: selectedCourseData.name,
        courseCode: selectedCourseData.code,
        classroomId: selectedClassroom,
        roomNumber: selectedClassroomData.roomNumber,
        time: selectedTime,
        date: new Date().toISOString().split("T")[0], // Today's date
        studentsPresent: 0,
        totalStudents: selectedCourseData.enrolledStudents ? selectedCourseData.enrolledStudents.length : 0,
        isActive: false,
        startTime: null,
        endTime: null,
        completed: false, // Add this field to track completed classes
        duration: 0 // Initialize duration field
      };
  
      // Save to Firestore
      const docRef = await addDoc(collection(db, "classes"), newClass);
  
      // Update local state
      setClasses((prevClasses) => {
        const updatedClasses = [
          ...prevClasses,
          {
            id: docRef.id,
            ...newClass,
            active: false,
          },
        ];
        
        // Sort classes by date and time
        updatedClasses.sort((a, b) => {
          if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
          }
          return a.time.localeCompare(b.time);
        });
        
        return updatedClasses;
      });
  
      // Reset form and close modal
      setSelectedCourse("");
      setSelectedClassroom("");
      setSelectedTime("");
      setModalVisible(false);
  
      Alert.alert("Success", "Class created successfully!");
    } catch (error) {
      console.error("Error adding class:", error);
      Alert.alert("Error", "Failed to add class. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Navigation to ClassesScreen
  const navigateToClasses = () => {
    navigation.navigate(ROUTES.CLASSES);
  };

  // Modified function to fetch and show enrolled students with roll numbers
  const showEnrolledStudents = async () => {
    try {
      setIsLoading(true);
      
      // Collect all enrolled student IDs from all courses
      let allStudentIds = [];
      courses.forEach(course => {
        if (course.enrolledStudents && Array.isArray(course.enrolledStudents)) {
          allStudentIds = [...allStudentIds, ...course.enrolledStudents];
        }
      });
      
      // Remove duplicates
      const uniqueStudentIds = [...new Set(allStudentIds)];
      
      // Fetch student details
      const studentsList = [];
      for (const studentId of uniqueStudentIds) {
        const studentDocRef = doc(db, "users", studentId);
        const studentDoc = await getDoc(studentDocRef);
        
        if (studentDoc.exists()) {
          const studentData = studentDoc.data();
          const email = studentData.email || "";
          let rollNumber = "";
          
          // Extract roll number from email (part before @iiitdwd.ac.in)
          if (email.includes("@iiitdwd.ac.in")) {
            rollNumber = email.split("@")[0];
          }
          
          if (rollNumber) {
            studentsList.push({
              id: studentId,
              rollNumber: rollNumber,
            });
          }
        }
      }
      
      // Sort by roll number in ascending order
      studentsList.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
      
      setEnrolledStudentsList(studentsList);
      setStudentsModalVisible(true);
    } catch (error) {
      console.error("Error fetching enrolled students:", error);
      Alert.alert("Error", "Failed to fetch student details.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#4c46b9" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
  {/* Header */}
  <LinearGradient
    colors={["#4c46b9", "#8a56ac"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.header}
  >
    <View>
      <View style={styles.profileRow}>
        <View>
          <Text style={styles.headerTitle}>Welcome, Prof. {professorName}</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: classActive ? "#4ade80" : "#fbbf24" },
              ]}
            />
            <Text style={styles.statusText}>
              {classActive ? "Class Active" : "No Active Classes"}
            </Text>
          </View>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>P</Text>
        </View>
      </View>
    </View>
  </LinearGradient>

      <ScrollView style={styles.scrollContent}>
        {/* Upcoming Classes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Classes</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Icon name="plus" size={18} color="#fff" />
              <Text style={styles.addButtonText}>Add Class</Text>
            </TouchableOpacity>
          </View>

          {classes.length === 0 ? (
            <View style={[styles.cardWhite, { alignItems: "center", padding: 20 }]}>
              <Text style={{ color: "#6b7280" }}>No upcoming classes scheduled</Text>
              <TouchableOpacity
                style={[styles.addButton, { marginTop: 12 }]}
                onPress={() => setModalVisible(true)}
              >
                <Icon name="plus" size={18} color="#fff" />
                <Text style={styles.addButtonText}>Add Class</Text>
              </TouchableOpacity>
            </View>
          ) : (
            classes.map((cls) => (
              <View key={cls.id} style={styles.cardWhite}>
                <View style={styles.classHeader}>
                  <View>
                    <Text style={styles.classTitle}>
                      {cls.courseName} ({cls.courseCode})
                    </Text>
                    <Text style={styles.classDetails}>
                      {formatDate(cls.date)} • {cls.time} • Room {cls.roomNumber}
                    </Text>
                  </View>
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: cls.active ? "#ef4444" : "#16a34a" },
                      ]}
                      onPress={() => toggleClassActive(cls.id)}
                    >
                      <Text style={styles.actionButtonText}>
                        {cls.active ? "End" : "Start"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: "#ef4444", marginLeft: 8 }
                      ]}
                      onPress={() => showDeleteConfirmation(cls.id)}
                    >
                      <Icon name="delete" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                {cls.active && (
                  <View style={styles.activeSessionCard}>
                    <View style={styles.sessionRow}>
                      <Text style={styles.sessionLabel}>Active Session</Text>
                      <Text style={styles.sessionTimer}>{formatTime(activeTime)}</Text>
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
          
          {/* Link to view completed classes */}
          <TouchableOpacity 
            style={styles.viewCompletedLink}
            onPress={navigateToClasses}
          >
            <Text style={styles.viewCompletedText}>View Completed Classes</Text>
            <Icon name="arrow-right" size={16} color="#4c46b9" />
          </TouchableOpacity>
        </View>

        {/* Attendance Overview - MODIFIED SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Attendance Overview</Text>
            <Text style={styles.sectionSubtitle}>This Week</Text>
          </View>

          <View style={styles.cardWhite}>
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: "#e0e7ff" }]}>
                <Text style={[styles.statValue, { color: "#4f46e5" }]}>
                  {courses.length}
                </Text>
                <Text style={styles.statLabel}>Courses</Text>
              </View>
              
              {/* Modified Students card - now clickable */}
              <TouchableOpacity 
                style={[styles.statCard, { backgroundColor: "#f3e8ff" }]}
                onPress={showEnrolledStudents}
              >
                <Text style={[styles.statValue, { color: "#9333ea" }]}>
                  {totalRegisteredStudents}
                </Text>
                <Text style={styles.statLabel}>Students</Text>
              </TouchableOpacity>
              
              <View style={[styles.statCard, { backgroundColor: "#dcfce7" }]}>
                <Text style={[styles.statValue, { color: "#16a34a" }]}>{averageAttendance}%</Text>
                <Text style={styles.statLabel}>Avg. Attendance</Text>
              </View>
            </View>
            
            {/* Removed "View Detailed Reports" button */}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: "#4f46e5" }]}>
              <Icon name="chart-box" size={24} color="#fff" style={styles.actionIcon} />
              <Text style={styles.actionText}>Export Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: "#9333ea" }]}
            onPress={() => navigation.navigate("AttendanceLook")}>
              <Icon name="account-search" size={24} color="#fff" style={styles.actionIcon} />
              <Text style={styles.actionText}>Student Lookup</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: "#2563eb" }]}
              onPress={() => navigation.navigate("AttendanceView")}
            >
              <Icon name="pencil" size={24} color="#fff" style={styles.actionIcon} />
              <Text style={styles.actionText}>Edit Records</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: "#16a34a" }]}>
              <Icon name="wifi" size={24} color="#fff" style={styles.actionIcon} />
              <Text style={styles.actionText}>WiFi Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Class Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Class</Text>

            {/* Course Picker */}
            <Text style={styles.inputLabel}>Select Course</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCourse}
                onValueChange={(itemValue) => setSelectedCourse(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select a course..." value="" />
                {courses.map((course) => (
                  <Picker.Item
                    key={course.id}
                    label={`${course.name} (${course.code})`}
                    value={course.id}
                  />
                ))}
              </Picker>
            </View>

            {/* Classroom Picker */}
            <Text style={styles.inputLabel}>Select Classroom</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedClassroom}
                onValueChange={(itemValue) => setSelectedClassroom(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select a classroom..." value="" />
                {classrooms.map((classroom) => (
                  <Picker.Item
                    key={classroom.id}
                    label={`Room ${classroom.roomNumber}`}
                    value={classroom.id}
                  />
                ))}
              </Picker>
            </View>

            {/* Class Time Input */}
            <Text style={styles.inputLabel}>Class Time</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 10:00 AM"
              value={selectedTime}
              onChangeText={setSelectedTime}
            />

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.addButton]}
                onPress={handleAddClass}
              >
                <Text style={styles.buttonText}>Add Class</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { padding: 20 }]}>
            <Text style={styles.modalTitle}>Delete Class</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete this class? This action cannot be undone.
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setClassToDelete(null);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#ef4444" }]}
                onPress={handleDeleteClass}
              >
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Students List Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={studentsModalVisible}
        onRequestClose={() => setStudentsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>Enrolled Students</Text>
            
            {enrolledStudentsList.length === 0 ? (
              <Text style={styles.modalText}>No students enrolled in your courses.</Text>
            ) : (
              <FlatList
                data={enrolledStudentsList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.studentItem}>
                   <Text style={styles.studentRollNumber}>{item.rollNumber}</Text>
                  </View>
                )}
                style={styles.studentsList}
              />
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#4c46b9", marginTop: 20 }]}
              onPress={() => setStudentsModalVisible(false)}
            >
              <Text style={styles.buttonText}>                              Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate(ROUTES.PROFESSOR_DASHBOARD)}>
          <Icon name="home" size={24} color="#2563eb" />
          <Text style={[styles.navText, { color: "#2563eb" }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate(ROUTES.CLASSES)}>
          <Icon name="calendar-month" size={24} color="#9ca3af" />
          <Text style={styles.navText}>Classes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate(ROUTES.STUDENTS)}>
          <Icon name="account-group" size={24} color="#9ca3af" />
          <Text style={styles.navText}>Students</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate(ROUTES.PROFILE)}>
          <Icon name="account-circle" size={24} color="#9ca3af" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: "#fff",
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4c46b9",
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  addButton: {
    backgroundColor: "#4c46b9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 4,
    fontSize: 12,
  },
  cardWhite: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    marginBottom: 10,
  },
  classHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  classTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  classDetails: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  actionButtonsContainer: {
    flexDirection: "row",
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  activeSessionCard: {
    backgroundColor: "rgba(79, 70, 229, 0.08)",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4f46e5",
  },
  sessionTimer: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4f46e5",
  },
  viewCompletedLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  viewCompletedText: {
    color: "#4c46b9",
    fontWeight: "600",
    marginRight: 4,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    color: "#4b5563",
    marginTop: 2,
  },
  reportsButton: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  reportsButtonText: {
    color: "#4b5563",
    fontWeight: "600",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  actionCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: "1%",
  },
  actionIcon: {
    marginBottom: 8,
  },
  actionText: {
    color: "#fff",
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginVertical: 20,
  },
  logoutText: {
    color: "#ef4444",
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "90%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  modalText: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  pickerContainer: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    marginBottom: 4,
  },
  picker: {
    height: 50,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#9ca3af",
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    padding: 8,
  },
  navText: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  }
});

export default ProfessorDashboard;