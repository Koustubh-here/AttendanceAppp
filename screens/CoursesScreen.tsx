import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

const CoursesScreen = ({ route }) => {
  const { courses } = route.params || { courses: [] };
  
  // Remove duplicate courses by creating a new array with unique values
  const uniqueCourses = [...new Set(courses)];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Courses</Text>
      <ScrollView>
        {uniqueCourses.map((course, index) => (
          <View key={index} style={styles.courseCard}>
            <Text style={styles.courseName}>{course}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F5F5F5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  courseCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  courseName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
});

export default CoursesScreen;