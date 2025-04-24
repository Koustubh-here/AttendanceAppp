import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebaseConfig";

const ProfileScreen = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            console.error("No user document found!");
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.profileCard}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{userData?.name || "Not available"}</Text>
        </View>
        
        <View style={styles.profileCard}>
          <Text style={styles.label}>Department</Text>
          <Text style={styles.value}>{userData?.department || "Not available"}</Text>
        </View>
        
        <View style={styles.profileCard}>
          <Text style={styles.label}>Roll No</Text>
          <Text style={styles.value}>{userData?.rollNo || "Not available"}</Text>
        </View>
        
        <View style={styles.profileCard}>
          <Text style={styles.label}>Semester</Text>
          <Text style={styles.value}>{userData?.semester || "Not available"}</Text>
        </View>
        
        <View style={styles.profileCard}>
          <Text style={styles.label}>Section</Text>
          <Text style={styles.value}>{userData?.section || "Not available"}</Text>
        </View>
        
        <View style={styles.profileCard}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{userData?.email || "Not available"}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    backgroundColor: "#4169E1",
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  content: {
    padding: 16,
  },
  profileCard: {
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
  label: {
    fontSize: 14,
    color: "#757575",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
});

export default ProfileScreen; 