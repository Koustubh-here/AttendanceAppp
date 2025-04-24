import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function LoginScreen({ route }) {
  const navigation = useNavigation();
  const { role } = route.params || {};

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [semester, setSemester] = useState("");
  const [section, setSection] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Determine button colors based on role
  const buttonColor = role === "Student" ? "#4A90E2" : "#5F6CAF";

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === role) {
          navigation.replace(role === "Student" ? "StudentDashboard" : "ProfessorDashboard");
        } else {
          Alert.alert("Error", "Incorrect role selected.");
        }
      } else {
        Alert.alert("Error", "User not found.");
      }
    } catch (error) {
      Alert.alert("Authentication Error", "Login failed. Please try again.");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !name || !department) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    if (!email.endsWith("@iiitdwd.ac.in")) {
      Alert.alert("Domain Error", "Only emails from iiitdwd.ac.in domain are allowed.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password should be at least 6 characters long.");
      return;
    }

    if (role === "Student" && (!rollNo || !semester || !section)) {
      Alert.alert("Error", "Students must fill all fields.");
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userData = {
        name,
        department,
        email,
        role,
      };

      if (role === "Student") {
        userData.rollNo = rollNo;
        userData.semester = parseInt(semester);
        userData.section = section;
      }

      await setDoc(doc(db, "users", user.uid), userData);

      Alert.alert("Account Created", `Your ${role} account has been created successfully.`, [
        { text: "OK", onPress: () => setIsSignup(false) }
      ]);
    } catch (error) {
      Alert.alert("Signup Error", "Signup failed. Please try again.");
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address first.");
      return;
    }

    if (!email.endsWith("@iiitdwd.ac.in")) {
      Alert.alert("Domain Error", "Only emails from iiitdwd.ac.in domain are allowed.");
      return;
    }

    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Password Reset", 
        "A password reset link has been sent to your email. Please check your inbox.",
        [{ text: "OK" }]
      );
    } catch (error) {
      let errorMessage = "Failed to send password reset email.";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No user found with this email address.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address.";
      }
      Alert.alert("Error", errorMessage);
      console.error("Forgot Password error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>{isSignup ? `Create ${role} Account` : `Login as ${role}`}</Text>

          {isSignup && (
            <>
              <Text style={styles.label}>Full Name</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Enter your full name" 
                placeholderTextColor="#888" 
                value={name} 
                onChangeText={setName} 
              />

              <Text style={styles.label}>Department</Text>
              <TextInput 
                style={styles.input} 
                placeholder="ex: CSE, ECE, etc." 
                placeholderTextColor="#888" 
                value={department} 
                onChangeText={setDepartment} 
              />

              {role === "Student" && (
                <>
                  <Text style={styles.label}>Roll No</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="ex: 23bcs***" 
                    placeholderTextColor="#888" 
                    value={rollNo} 
                    onChangeText={setRollNo} 
                  />

                  <Text style={styles.label}>Semester</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="ex: 4 " 
                    placeholderTextColor="#888" 
                    value={semester} 
                    onChangeText={setSemester} 
                    keyboardType="numeric" 
                  />

                  <Text style={styles.label}>Section</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="ex: A" 
                    placeholderTextColor="#888" 
                    value={section} 
                    onChangeText={setSection} 
                  />
                </>
              )}
            </>
          )}

          <Text style={styles.label}>Email</Text>
          <TextInput 
            style={styles.input} 
            placeholder="ex: 23bcs***@iiitdwd.ac.in" 
            placeholderTextColor="#888" 
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address" 
            autoCapitalize="none" 
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput 
              style={[styles.passwordInput, { color: '#000' }]} 
              placeholder="enter your password" 
              placeholderTextColor="#888" 
              value={password} 
              onChangeText={setPassword} 
              secureTextEntry={!showPassword} 
              autoCapitalize="none" 
            />
            <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off" : "eye"} 
                size={24} 
                color="#888" 
              />
            </TouchableOpacity>
          </View>

          {!isSignup && (
            <TouchableOpacity 
              style={styles.forgotPasswordButton} 
              onPress={handleForgotPassword}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.loginButton, { backgroundColor: buttonColor }]} 
            onPress={isSignup ? handleSignup : handleLogin} 
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isSignup ? "Sign Up" : "Login"}</Text>}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setIsSignup(!isSignup)} 
            disabled={isLoading}
          >
            <Text style={styles.toggleSignupText}>
              {isSignup ? "Already have an account? Login" : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 20 },
  container: { width: "100%", alignItems: "center", backgroundColor: "#f4f4f4", paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  label: { fontSize: 16, fontWeight: "bold", alignSelf: "flex-start", marginBottom: 5, marginLeft: 20 },
  input: { width: "90%", padding: 12, backgroundColor: "#fff", borderRadius: 10, marginBottom: 15, elevation: 2 },
  passwordContainer: { 
    width: "90%", 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#fff", 
    borderRadius: 10, 
    marginBottom: 15, 
    elevation: 2 
  },
  passwordInput: { 
    flex: 1, 
    padding: 12, 
    borderRadius: 10 
  },
  eyeIcon: { 
    padding: 10 
  },
  forgotPasswordButton: {
    alignSelf: "flex-end", 
    marginRight: "10%", 
    marginBottom: 10
  },
  forgotPasswordText: {
    color: "blue", 
    fontSize: 14,
    textDecorationLine: "underline"
  },
  loginButton: { 
    paddingVertical: 12, 
    borderRadius: 10, 
    width: "90%", 
    alignItems: "center", 
    marginTop: 10 
  },
  toggleSignupText: { 
    color: "#888", 
    fontSize: 14, 
    marginTop: 15, 
    textDecorationLine: "underline" 
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});