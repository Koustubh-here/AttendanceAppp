import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebaseConfig";

const AttendanceLook = () => {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [view, setView] = useState("courses"); // "courses", "students", or "attendance"
  const auth = getAuth();

  // Fetch professor's courses on component mount
  useEffect(() => {
    fetchProfessorCourses();
  }, []);

  const fetchProfessorCourses = async () => {
    setLoading(true);
    try {
      const professorId = auth.currentUser.uid;
      
      // Query courses where professorId matches the current user
      const coursesQuery = query(
        collection(db, "courses"),
        where("professorId", "==", professorId)
      );
      
      const coursesSnapshot = await getDocs(coursesQuery);
      const fetchedCourses = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCourses(fetchedCourses);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching professor courses:", error);
      setLoading(false);
    }
  };

  // Fetch enrolled students for a selected course
  const fetchEnrolledStudents = async (courseId) => {
    setLoading(true);
    try {
      // Get course document to fetch enrolled students
      const courseDocRef = doc(db, "courses", courseId);
      const courseDocSnap = await getDoc(courseDocRef);
      
      if (courseDocSnap.exists()) {
        const courseData = courseDocSnap.data();
        const enrolledStudentIds = courseData.enrolledStudents || [];
        
        // For each student, fetch their details and attendance percentage
        const studentsPromises = enrolledStudentIds.map(async (studentId) => {
          // Get student details
          const studentDocRef = doc(db, "users", studentId);
          const studentDocSnap = await getDoc(studentDocRef);
          
          // Get student's attendance percentage for this course
          const attendanceQuery = query(
            collection(db, "studentCourseAttendance"),
            where("studentId", "==", studentId),
            where("courseId", "==", courseId)
          );
          
          const attendanceSnapshot = await getDocs(attendanceQuery);
          let attendancePercentage = 0;
          let classesAttended = 0;
          let totalClassesHeld = 0;
          
          if (!attendanceSnapshot.empty) {
            const attendanceData = attendanceSnapshot.docs[0].data();
            attendancePercentage = attendanceData.attendancePercentage || 0;
            classesAttended = attendanceData.classesAttended || 0;
            totalClassesHeld = attendanceData.totalClassesHeld || 0;
          }
          
          if (studentDocSnap.exists()) {
            const studentData = studentDocSnap.data();
            return {
              id: studentId,
              name: studentData.name,
              rollNo: studentData.rollNo,
              attendancePercentage,
              classesAttended,
              totalClassesHeld
            };
          }
          return null;
        });
        
        const fetchedStudents = (await Promise.all(studentsPromises)).filter(student => student !== null);
        setEnrolledStudents(fetchedStudents);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching enrolled students:", error);
      setLoading(false);
    }
  };

  // Fetch attendance records for a selected student
  const fetchStudentAttendanceRecords = async (studentId, courseId) => {
    setLoading(true);
    try {
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
      
      // For each class, check if student was present
      const attendanceRecordsPromises = classesData.map(async (classItem) => {
        // Check if student attended this class
        const studentAttendanceQuery = query(
          collection(db, "studentAttendance"),
          where("classId", "==", classItem.id),
          where("studentId", "==", studentId)
        );
        
        const studentAttendanceSnapshot = await getDocs(studentAttendanceQuery);
        let attended = false;
        let joinTime = null;
        let leaveTime = null;
        let studentDuration = 0;
        let bioVerified = false;
        let attendanceMet = false;
        let isPresent = false;
        let attendanceStatus = "Absent";
        let attendanceStatusReason = "";
        
        if (!studentAttendanceSnapshot.empty) {
          const attendanceData = studentAttendanceSnapshot.docs[0].data();
          isPresent = attendanceData.isPresent || false;
          bioVerified = attendanceData.bioVerified || false;
          attendanceMet = attendanceData.attendanceMet || false;
          joinTime = attendanceData.joinTime ? attendanceData.joinTime.toDate().toLocaleTimeString() : null;
          leaveTime = attendanceData.leaveTime ? attendanceData.leaveTime.toDate().toLocaleTimeString() : null;
          studentDuration = attendanceData.studentDuration || 0;
          
          // Student is marked as attended only if all three conditions are met
          attended = isPresent && bioVerified && attendanceMet;
          
          // Set appropriate status reason
          if (!isPresent) {
            attendanceStatusReason = "Not marked present";
          } else if (!bioVerified) {
            attendanceStatusReason = "Bio verification failed";
          } else if (!attendanceMet) {
            attendanceStatusReason = "Attendance duration not met";
          }
          
          if (attended) {
            attendanceStatus = "Present";
            attendanceStatusReason = "";
          }
        }
        
        return {
          id: classItem.id,
          date: classItem.date,
          time: classItem.time,
          attended,
          joinTime,
          leaveTime,
          studentDuration,
          courseName: classItem.courseName || "Class Session",
          actualDuration: classItem.actualDuration || 0,
          bioVerified,
          attendanceMet,
          isPresent,
          attendanceStatus,
          attendanceStatusReason
        };
      });
      
      const attendanceData = await Promise.all(attendanceRecordsPromises);
      // Sort by date, most recent first
      attendanceData.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setAttendanceRecords(attendanceData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching student attendance records:", error);
      setLoading(false);
    }
  };

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    fetchEnrolledStudents(course.id);
    setView("students");
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    fetchStudentAttendanceRecords(student.id, selectedCourse.id);
    setView("attendance");
  };

  const goBackToCourses = () => {
    setView("courses");
    setSelectedCourse(null);
  };

  const goBackToStudents = () => {
    setView("students");
    setSelectedStudent(null);
  };

  // Render course selection screen
  const renderCourseSelection = () => {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Your Courses</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#4267B2" />
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
                <Text style={styles.courseStat}>
                  Total Classes: {item.totalClassesHeld || 0}
                </Text>
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

  // Render students list for selected course
  const renderStudentsList = () => {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={goBackToCourses}>
          <Text style={styles.backButtonText}>← Back to Courses</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Students: {selectedCourse?.name}</Text>
        <Text style={styles.subtitle}>Total Classes Held: {selectedCourse?.totalClassesHeld || 0}</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#4267B2" />
        ) : (
          <FlatList
            data={enrolledStudents}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.studentItem}
                onPress={() => handleStudentSelect(item)}
              >
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <Text style={styles.studentRoll}>{item.rollNo}</Text>
                </View>
                <View style={styles.attendanceInfo}>
                  <Text style={[
                    styles.attendancePercentage,
                    getAttendanceStyle(item.attendancePercentage)
                  ]}>
                    {item.attendancePercentage}%
                  </Text>
                  <Text style={styles.attendanceDetail}>
                    {item.classesAttended}/{item.totalClassesHeld} classes
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No enrolled students found</Text>
            }
          />
        )}
      </View>
    );
  };

  // Helper function to get style based on attendance percentage
  const getAttendanceStyle = (percentage) => {
    if (percentage >= 75) return styles.goodAttendance;
    if (percentage >= 60) return styles.warningAttendance;
    return styles.poorAttendance;
  };

  // Render attendance records for selected student
  const renderAttendanceRecords = () => {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={goBackToStudents}>
          <Text style={styles.backButtonText}>← Back to Students</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Attendance: {selectedStudent?.name}</Text>
        <Text style={styles.subtitle}>{selectedCourse?.name} ({selectedCourse?.code})</Text>
        
        <View style={styles.statsContainer}>
          <Text style={[
            styles.statsText,
            getAttendanceStyle(selectedStudent?.attendancePercentage)
          ]}>
            Attendance Rate: {selectedStudent?.attendancePercentage}% 
            ({selectedStudent?.classesAttended} of {selectedStudent?.totalClassesHeld} classes)
          </Text>
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color="#4267B2" />
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
                <View style={styles.attendanceMain}>
                  <Text style={styles.dateText}>{item.date} - {item.time}</Text>
                  <Text style={styles.topicText}>{item.courseName}</Text>
                  
                  {item.joinTime && (
                    <View style={styles.timeDetails}>
                      <Text style={styles.timeText}>
                        Joined: {item.joinTime || 'N/A'}
                      </Text>
                      <Text style={styles.timeText}>
                        Left: {item.leaveTime || 'N/A'}
                      </Text>
                      <Text style={styles.durationText}>
                        Duration: {item.studentDuration} min / {item.actualDuration} min
                      </Text>
                      
                      {/* Display verification details */}
                      {!item.attended && item.isPresent && (
                        <View style={styles.verificationDetails}>
                          <Text style={styles.verificationText}>
                            Bio Verified: {item.bioVerified ? "Yes" : "No"}
                          </Text>
                          <Text style={styles.verificationText}>
                            Duration Met: {item.attendanceMet ? "Yes" : "No"}
                          </Text>
                          {item.attendanceStatusReason && (
                            <Text style={styles.statusReason}>
                              Reason: {item.attendanceStatusReason}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
                <View style={[
                  styles.attendanceStatus,
                  item.attended ? styles.attendedStatus : styles.missedStatus
                ]}>
                  <Text style={[
                    styles.statusText,
                    item.attended ? styles.attendedText : styles.missedText
                  ]}>
                    {item.attendanceStatus}
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

  // Determine which view to render
  if (view === "courses") {
    return renderCourseSelection();
  } else if (view === "students") {
    return renderStudentsList();
  } else {
    return renderAttendanceRecords();
  }
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
    marginBottom: 8,
    textAlign: "center"
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
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
  courseStat: {
    fontSize: 12,
    color: "#888",
    marginTop: 4
  },
  studentItem: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  studentInfo: {
    flex: 1
  },
  studentName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333"
  },
  studentRoll: {
    fontSize: 14,
    color: "#666",
    marginTop: 2
  },
  attendanceInfo: {
    alignItems: "flex-end"
  },
  attendancePercentage: {
    fontSize: 18,
    fontWeight: "bold"
  },
  attendanceDetail: {
    fontSize: 12,
    color: "#666",
    marginTop: 2
  },
  goodAttendance: {
    color: "#28a745"
  },
  warningAttendance: {
    color: "#ffc107"
  },
  poorAttendance: {
    color: "#dc3545"
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
    color: "#4267B2"
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
    alignItems: "flex-start",
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
  attendanceMain: {
    flex: 1
  },
  attendedClass: {
    borderLeftWidth: 5,
    borderLeftColor: "#28a745"
  },
  missedClass: {
    borderLeftWidth: 5,
    borderLeftColor: "#dc3545"
  },
  dateText: {
    fontSize: 14,
    fontWeight: "bold"
  },
  topicText: {
    fontSize: 14,
    color: "#666",
    marginTop: 2
  },
  timeDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee"
  },
  timeText: {
    fontSize: 12,
    color: "#666"
  },
  durationText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2
  },
  attendanceStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8
  },
  attendedStatus: {
    backgroundColor: "rgba(40, 167, 69, 0.1)"
  },
  missedStatus: {
    backgroundColor: "rgba(220, 53, 69, 0.1)"
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold"
  },
  attendedText: {
    color: "#28a745"
  },
  missedText: {
    color: "#dc3545"
  },
  verificationDetails: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    borderStyle: "dashed"
  },
  verificationText: {
    fontSize: 12,
    color: "#666"
  },
  statusReason: {
    fontSize: 12,
    color: "#dc3545",
    fontStyle: "italic",
    marginTop: 2
  }
});

export default AttendanceLook;