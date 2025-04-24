import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Modal, ScrollView } from "react-native";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebaseConfig";

const ViewAttendance = () => {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classAttendance, setClassAttendance] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [view, setView] = useState("courses"); // "courses", "classes", "attendance"
  const auth = getAuth();

  // Fetch courses taught by professor
  useEffect(() => {
    fetchProfessorCourses();
  }, []);

  const fetchProfessorCourses = async () => {
    setLoading(true);
    try {
      const userId = auth.currentUser.uid;
      
      // Query courses where the current user is the professor
      const coursesQuery = query(
        collection(db, "courses"),
        where("professorId", "==", userId)
      );
      
      const coursesSnapshot = await getDocs(coursesQuery);
      const fetchedCourses = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCourses(fetchedCourses);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching courses:", error);
      setLoading(false);
    }
  };

  // Fetch classes for a selected course
  const fetchCourseClasses = async (courseId) => {
    setLoading(true);
    try {
      const classesQuery = query(
        collection(db, "classes"),
        where("courseId", "==", courseId)
      );
      
      const classesSnapshot = await getDocs(classesQuery);
      const fetchedClasses = classesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setClasses(fetchedClasses);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching classes:", error);
      setLoading(false);
    }
  };

  // Fetch attendance details for a specific class
  const fetchClassAttendance = async (classId) => {
    setLoading(true);
    try {
      // Fetch all student attendance records for this class
      const attendanceQuery = query(
        collection(db, "studentAttendance"),
        where("classId", "==", classId)
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      // Fetch student details for each attendance record
      const attendancePromises = attendanceSnapshot.docs.map(async (attendanceDoc) => {
        const attendanceData = attendanceDoc.data();
        
        // Fetch student details
        const studentDocRef = doc(db, "users", attendanceData.studentId);
        const studentDocSnap = await getDoc(studentDocRef);
        
        const studentData = studentDocSnap.exists() ? studentDocSnap.data() : {};
        
        return {
          ...attendanceData,
          studentName: studentData.name || 'Unknown',
          rollNo: studentData.rollNo || 'N/A'
        };
      });
      
      const completeAttendanceData = await Promise.all(attendancePromises);
      
      setClassAttendance(completeAttendanceData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching class attendance:", error);
      setLoading(false);
    }
  };

  // Handle course selection
  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    fetchCourseClasses(course.id);
    setView("classes");
  };

  // Handle class selection
  const handleClassSelect = (classItem) => {
    setSelectedClass(classItem);
    fetchClassAttendance(classItem.id);
    setView("attendance");
  };

  // Render course selection screen
  const renderCourseSelection = () => {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Your Courses</Text>
        
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
              <Text style={styles.emptyText}>No courses found</Text>
            }
          />
        )}
      </View>
    );
  };

  // Render classes for selected course
  const renderCourseClasses = () => {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setView("courses")}
        >
          <Text style={styles.backButtonText}>← Back to Courses</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Classes - {selectedCourse?.name}</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="blue" />
        ) : (
          <FlatList
            data={classes}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.classItem}
                onPress={() => handleClassSelect(item)}
              >
                <Text style={styles.dateText}>{item.date}</Text>
                <Text style={styles.timeText}>{item.time}</Text>
                <Text style={styles.roomText}>Room: {item.roomNumber}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No classes found</Text>
            }
          />
        )}
      </View>
    );
  };

  // Render attendance details for selected class
  const renderClassAttendance = () => {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setView("classes")}
        >
          <Text style={styles.backButtonText}>← Back to Classes</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Attendance Details</Text>
        <Text style={styles.subtitleText}>
          {selectedClass?.date} - {selectedClass?.time}
        </Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="blue" />
        ) : (
          <FlatList
            data={classAttendance}
            keyExtractor={(item) => item.studentId}
            style={styles.list}
            renderItem={({ item }) => (
              <View style={[
                styles.attendanceItem,
                item.isPresent ? styles.presentItem : styles.absentItem
              ]}>
                <View>
                  <Text style={styles.studentName}>{item.studentName}</Text>
                  <Text style={styles.rollNoText}>{item.rollNo}</Text>
                </View>
                <Text style={styles.attendanceStatus}>
                  {item.isPresent ? "Present" : "Absent"}
                </Text>
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

  // Render the appropriate view based on current state
  return (
    view === "courses" 
      ? renderCourseSelection() 
      : view === "classes" 
        ? renderCourseClasses() 
        : renderClassAttendance()
  );
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
  subtitleText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
    color: "#666"
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
  classItem: {
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
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333"
  },
  timeText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4
  },
  roomText: {
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
  attendanceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  presentItem: {
    borderLeftWidth: 5,
    borderLeftColor: "green"
  },
  absentItem: {
    borderLeftWidth: 5,
    borderLeftColor: "red"
  },
  studentName: {
    fontSize: 16,
    fontWeight: "bold"
  },
  rollNoText: {
    fontSize: 14,
    color: "#666"
  },
  attendanceStatus: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333"
  }
});

export default ViewAttendance;