import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebaseConfig"; // Make sure to import your firebase config

const ViewAttendance = () => {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendancePercentage, setAttendancePercentage] = useState(0);
  const [classesAttended, setClassesAttended] = useState(0);
  const [totalClassesHeld, setTotalClassesHeld] = useState(0);
  const [view, setView] = useState("courses"); // "courses" or "attendance"
  const auth = getAuth();

  // Fetch student's enrolled courses from database
  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const fetchEnrolledCourses = async () => {
    setLoading(true);
    try {
      const userId = auth.currentUser.uid;
      
      // Get user document to fetch enrolled courses
      const userDocRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const enrolledCourseIds = userData.enrolledCourses || [];
        
        // Fetch details for each enrolled course
        const coursePromises = enrolledCourseIds.map(async (courseId) => {
          const courseDocRef = doc(db, "courses", courseId);
          const courseDocSnap = await getDoc(courseDocRef);
          
          if (courseDocSnap.exists()) {
            const courseData = courseDocSnap.data();
            return {
              id: courseId,
              code: courseData.code,
              name: courseData.name,
              totalClassesHeld: courseData.totalClassesHeld || 0
            };
          }
          return null;
        });
        
        const fetchedCourses = (await Promise.all(coursePromises)).filter(course => course !== null);
        setCourses(fetchedCourses);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching courses:", error);
      setLoading(false);
    }
  };

  // Fetch attendance records and statistics for selected course
  const fetchAttendanceRecords = async (courseId) => {
    setLoading(true);
    try {
      const userId = auth.currentUser.uid;
      
      // Get attendance percentage from studentCourseAttendance
      const attendanceQuery = query(
        collection(db, "studentCourseAttendance"),
        where("studentId", "==", userId),
        where("courseId", "==", courseId)
      );
      
      const attendanceQuerySnapshot = await getDocs(attendanceQuery);
      if (!attendanceQuerySnapshot.empty) {
        const attendanceData = attendanceQuerySnapshot.docs[0].data();
        setAttendancePercentage(attendanceData.attendancePercentage || 0);
        setClassesAttended(attendanceData.classesAttended || 0);
        setTotalClassesHeld(attendanceData.totalClassesHeld || 0);
      }
      
      // Get all classes for this course
      const classesQuery = query(
        collection(db, "classes"),
        where("courseId", "==", courseId)
      );
      
      const classesQuerySnapshot = await getDocs(classesQuery);
      const classesData = classesQuerySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // For each class, check if student was present using isPresent field
      const attendanceRecordsPromises = classesData.map(async (classItem) => {
        // Check if student attended this class
        const studentAttendanceQuery = query(
          collection(db, "studentAttendance"),
          where("classId", "==", classItem.id),
          where("studentId", "==", userId)
        );
        
        const studentAttendanceSnapshot = await getDocs(studentAttendanceQuery);
        let attended = false;
        
        if (!studentAttendanceSnapshot.empty) {
          // Get the attendance document and check isPresent field
          const attendanceDoc = studentAttendanceSnapshot.docs[0].data();
          attended = attendanceDoc.isPresent === true;
        }
        
        return {
          id: classItem.id,
          date: classItem.date,
          time: classItem.time,
          attended: attended,
          // Using courseName as topic since your schema doesn't have topic
          topic: classItem.courseName || "Class Session"
        };
      });
      
      const attendanceData = await Promise.all(attendanceRecordsPromises);
      setAttendanceRecords(attendanceData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      setLoading(false);
    }
  };

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    fetchAttendanceRecords(course.id);
    setView("attendance");
  };

  const goBackToCourses = () => {
    setView("courses");
    setSelectedCourse(null);
  };

  // Render course selection screen
  const renderCourseSelection = () => {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Select Course</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="blue" />
        ) : (
          <FlatList
            data={courses}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.courseItem}
                onPress={() => handleCourseSelect(item)}
              >
                <Text style={styles.courseCode}>{item.code}</Text>
                <Text style={styles.courseName}>{item.name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No enrolled courses found</Text>
            }
          />
        )}
      </View>
    );
  };

  // Render attendance records for selected course
  const renderAttendanceRecords = () => {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={goBackToCourses}>
          <Text style={styles.backButtonText}>← Back to Courses</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Attendance: {selectedCourse?.name}</Text>
        
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            Attendance Rate: {attendancePercentage}% ({classesAttended} of {totalClassesHeld} classes)
          </Text>
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color="blue" />
        ) : (
          <FlatList
            data={attendanceRecords}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => (
              <View style={[
                styles.attendanceItem,
                item.attended ? styles.attendedClass : styles.missedClass
              ]}>
                <View>
                  <Text style={styles.dateText}>{item.date}</Text>
                  <Text style={styles.topicText}>{item.topic} - {item.time}</Text>
                </View>
                <View style={[
                  styles.attendanceStatus,
                  item.attended ? styles.attendedStatus : styles.missedStatus
                ]}>
                  <Text style={styles.statusText}>
                    {item.attended ? "Present" : "Absent"}
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No attendance records found</Text>
            }
          />
        )}
      </View>
    );
  };

  return view === "courses" ? renderCourseSelection() : renderAttendanceRecords();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center"
  },
  list: {
    width: "100%"
  },
  courseItem: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  courseCode: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333"
  },
  courseName: {
    fontSize: 14,
    color: "#666",
    marginTop: 4
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginTop: 20
  },
  backButton: {
    marginBottom: 16
  },
  backButtonText: {
    fontSize: 16,
    color: "blue"
  },
  statsContainer: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  statsText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center"
  },
  attendanceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    backgroundColor: "white"
  },
  attendedClass: {
    borderLeftWidth: 5,
    borderLeftColor: "green"
  },
  missedClass: {
    borderLeftWidth: 5,
    borderLeftColor: "red"
  },
  dateText: {
    fontSize: 14,
    fontWeight: "bold"
  },
  topicText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4
  },
  attendanceStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  attendedStatus: {
    backgroundColor: "rgba(0, 128, 0, 0.1)"
  },
  missedStatus: {
    backgroundColor: "rgba(255, 0, 0, 0.1)"
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold"
  }
});

export default ViewAttendance;