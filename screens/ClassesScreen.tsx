import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { getAuth } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useIsFocused } from "@react-navigation/native";

const ClassesScreen = () => {
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth();
  const isFocused = useIsFocused();

  // Fetch classes data when the screen is focused
  useEffect(() => {
    if (isFocused) {
      fetchClasses();
    }
  }, [isFocused]);

  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      const user = auth.currentUser;

      if (user) {
        // Get today's date string for comparison
        const today = new Date().toISOString().split("T")[0];

        // Query all classes for the current professor
        const classesRef = collection(db, "classes");
        const q = query(classesRef, where("professorId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        // Transform the data and sort by date and time
        const classesData = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Get the student count from the totalStudents array
          let studentCount = 0;
          if (data.totalStudents && Array.isArray(data.totalStudents)) {
            studentCount = data.totalStudents.length;
          }
          
          return {
            id: doc.id,
            ...data,
            studentCount: studentCount,
            isToday: data.date === today
          };
        });

        // Sort classes: today's classes first, then by time
        classesData.sort((a, b) => {
          // First sort by whether the class is today or not
          if (a.isToday && !b.isToday) return -1;
          if (!a.isToday && b.isToday) return 1;
          
          // For classes on the same day, sort by time
          return a.time.localeCompare(b.time);
        });

        setClasses(classesData);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderClassItem = ({ item }) => (
    <View style={[styles.classCard, item.isToday ? styles.todayClassCard : null]}>
      {item.isToday && (
        <View style={styles.todayBadge}>
          <Text style={styles.todayBadgeText}>Today</Text>
        </View>
      )}
      <View style={styles.classCardHeader}>
        <View>
          <Text style={styles.classTime}>{item.time}</Text>
          <Text style={styles.classCourse}>
            {item.courseName} ({item.courseCode})
          </Text>
          <Text style={styles.classRoom}>Room {item.roomNumber}</Text>
        </View>
        <View style={styles.attendanceIndicator}>
          <Text style={styles.attendanceText}>
            {item.studentCount}
          </Text>
          <Text style={styles.attendanceLabel}>Students</Text>
        </View>
      </View>
      
      {item.active && (
        <View style={styles.activeSessionTag}>
          <View style={styles.activeDot} />
          <Text style={styles.activeText}>Class in session</Text>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4c46b9" />
        <Text style={styles.loadingText}>Loading classes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Classes</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchClasses}>
          <Icon name="refresh" size={20} color="#4c46b9" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={renderClassItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="calendar-blank" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No classes scheduled</Text>
            <Text style={styles.emptySubtext}>
              Add classes from the dashboard to see them here
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f3f4f6",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#6b7280",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#e0e7ff",
  },
  listContent: {
    paddingBottom: 20,
  },
  classCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  todayClassCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#4c46b9",
  },
  todayBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayBadgeText: {
    color: "#4c46b9",
    fontSize: 12,
    fontWeight: "bold",
  },
  classCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  classTime: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  classCourse: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  classRoom: {
    fontSize: 14,
    color: "#6b7280",
  },
  attendanceIndicator: {
    alignItems: "center",
    justifyContent: "center",
  },
  attendanceText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4c46b9",
  },
  attendanceLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  activeSessionTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16a34a",
    marginRight: 6,
  },
  activeText: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6b7280",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
  },
});

export default ClassesScreen;