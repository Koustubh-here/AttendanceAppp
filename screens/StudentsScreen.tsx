import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const StudentsScreen = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [professorName, setProfessorName] = useState("");

  const auth = getAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const user = auth.currentUser;

      if (user) {
        // Fetch professor's name
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfessorName(userData.name);

          // Fetch courses taught by the professor
          const coursesRef = collection(db, "courses");
          const coursesQuery = query(coursesRef, where("professorId", "==", user.uid));
          const coursesSnapshot = await getDocs(coursesQuery);
          
          const coursesData = coursesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          
          setCourses(coursesData);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to fetch courses. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCourseSelect = async (course) => {
    try {
      setIsLoading(true);
      setSelectedCourse(course);
      
      // Get student details for the selected course
      const studentsData = [];
      
      // Check if enrolledStudents array exists and has items
      if (course.enrolledStudents && course.enrolledStudents.length > 0) {
        for (const studentId of course.enrolledStudents) {
          const studentDocRef = doc(db, "users", studentId);
          const studentDoc = await getDoc(studentDocRef);
          
          if (studentDoc.exists()) {
            studentsData.push({
              id: studentId,
              ...studentDoc.data(),
            });
          }
        }
      }
      
      setStudents(studentsData);
    } catch (error) {
      console.error("Error fetching students:", error);
      Alert.alert("Error", "Failed to fetch students. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedCourse(null);
    setStudents([]);
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
          <Text style={styles.headerTitle}>
            {selectedCourse ? "Course Students" : "My Courses"}
          </Text>
          <View style={styles.profileRow}>
            <View>
              <Text style={styles.welcomeText}>Welcome, Prof. {professorName}</Text>
              {selectedCourse && (
                <Text style={styles.selectedCourseText}>
                  {selectedCourse.name} ({selectedCourse.code})
                </Text>
              )}
            </View>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>P</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollContent}>
        {!selectedCourse ? (
          // Display courses list
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Courses You Teach</Text>
            {courses.length === 0 ? (
              <View style={[styles.cardWhite, { alignItems: "center", padding: 20 }]}>
                <Text style={{ color: "#6b7280" }}>No courses assigned yet</Text>
              </View>
            ) : (
              courses.map((course) => (
                <TouchableOpacity
                  key={course.id}
                  style={styles.courseCard}
                  onPress={() => handleCourseSelect(course)}
                >
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseName}>{course.name}</Text>
                    <Text style={styles.courseCode}>{course.code}</Text>
                  </View>
                  <View style={styles.courseStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {course.enrolledStudents ? course.enrolledStudents.length : 0}
                      </Text>
                      <Text style={styles.statLabel}>Students</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color="#6b7280" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          // Display students list for selected course
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Icon name="arrow-left" size={20} color="#4c46b9" />
                <Text style={styles.backButtonText}>Back to Courses</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Enrolled Students</Text>
            {students.length === 0 ? (
              <View style={[styles.cardWhite, { alignItems: "center", padding: 20 }]}>
                <Text style={{ color: "#6b7280" }}>No students enrolled yet</Text>
              </View>
            ) : (
              students.map((student) => (
                <View key={student.id} style={styles.studentCard}>
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentAvatarText}>
                      {student.name ? student.name.charAt(0) : "S"}
                    </Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentDetails}>
                      Roll No: {student.rollNo} | Section: {student.section}
                    </Text>
                    <Text style={styles.studentDetails}>
                      Semester: {student.semester} | Department: {student.department}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("ProfessorDashboard")}
        >
          <Icon name="home" size={24} color="#9ca3af" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Classes")}
        >
          <Icon name="calendar-month" size={24} color="#9ca3af" />
          <Text style={styles.navText}>Classes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="account-group" size={24} color="#2563eb" />
          <Text style={[styles.navText, { color: "#2563eb" }]}>Students</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Profile")}
        >
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
    backgroundColor: "#f3f4f6",
  },
  header: {
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: "white",
    opacity: 0.9,
  },
  selectedCourseText: {
    fontSize: 14,
    color: "white",
    opacity: 0.8,
    marginTop: 4,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    marginLeft: 4,
    color: "#4c46b9",
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#111827",
  },
  courseCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  courseCode: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  courseStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    marginRight: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4c46b9",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  studentCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0e7ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  studentAvatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4c46b9",
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  studentDetails: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  cardWhite: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "white",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  navItem: {
    alignItems: "center",
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: "#9ca3af",
  },
});

export default StudentsScreen;