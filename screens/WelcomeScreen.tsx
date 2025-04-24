import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function WelcomeScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f4f4" />
      <View style={styles.content}>
        <Text style={styles.title}>PresencePro</Text>
        <Text style={styles.subtitle}>Select Your Role</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.studentButton]}
            onPress={() => navigation.navigate("LoginScreen", { role: "Student" })}
          >
            <Text style={styles.buttonText}>Student</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.professorButton]}
            onPress={() => navigation.navigate("LoginScreen", { role: "Professor" })}
          >
            <Text style={styles.buttonText}>Professor</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f4",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 40, // Increased font size
    fontWeight: "900",
    color: "#333",
    marginBottom: 10,
    letterSpacing: -1,
    textShadow: '1px 1px 2px rgba(0,0,0,0.1)', // Added subtle shadow for depth
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 30, // Slightly reduced margin
    fontWeight: "500",
  },
  buttonContainer: {
    width: "80%", // Reduced width to make buttons smaller
  },
  button: {
    paddingVertical: 14, // Reduced vertical padding
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 8, // Reduced vertical margin
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  studentButton: {
    backgroundColor: "#4A90E2", // A professional blue
  },
  professorButton: {
    backgroundColor: "#5F6CAF", // A sophisticated purple-blue
  },
  buttonText: {
    color: "#fff",
    fontSize: 16, // Slightly reduced font size
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});