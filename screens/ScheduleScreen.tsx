import React, { useState } from 'react';
import {
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const ClassCard = ({ classItem, type }) => {
  const getCardStyle = (type) => {
    return type === 'upcoming' 
      ? styles.upcomingClassCard 
      : styles.completedClassCard;
  };

  return (
    <TouchableOpacity style={getCardStyle(type)}>
      <View style={styles.classCardHeader}>
        <Text style={styles.subjectText}>{classItem.subject} ({classItem.code})</Text>
        <Text style={styles.professorText}>{classItem.professor}</Text>
      </View>
      <View style={styles.classCardDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="access-time" size={16} color="#666" />
          <Text style={styles.detailText}>{classItem.time}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="calendar-today" size={16} color="#666" />
          <Text style={styles.detailText}>{classItem.date}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="room" size={16} color="#666" />
          <Text style={styles.detailText}>{classItem.room}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ScheduleScreen = ({ route }) => {
  const { upcomingClasses = [], completedClasses = [] } = route.params || {};
  
  const [activeTab, setActiveTab] = useState('upcoming');

  const renderClassList = (classes, type) => {
    return classes.length > 0 ? (
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ClassCard classItem={item} type={type} />
        )}
        contentContainerStyle={styles.listContainer}
      />
    ) : (
      <View style={styles.emptyStateContainer}>
        <MaterialIcons 
          name={type === 'upcoming' ? 'calendar-today' : 'check-circle'} 
          size={64} 
          color="#A0A0A0" 
        />
        <Text style={styles.emptyStateText}>
          {type === 'upcoming' 
            ? 'No upcoming classes' 
            : 'No completed classes yet'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'upcoming' && styles.activeTab
          ]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[
            styles.tabText, 
            activeTab === 'upcoming' && styles.activeTabText
          ]}>
            Upcoming Classes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'completed' && styles.activeTab
          ]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[
            styles.tabText, 
            activeTab === 'completed' && styles.activeTabText
          ]}>
            Completed Classes
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'upcoming' 
        ? renderClassList(upcomingClasses, 'upcoming')
        : renderClassList(completedClasses, 'completed')}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20
  },
  activeTab: {
    backgroundColor: '#007BFF',
  },
  tabText: {
    color: '#666',
    fontWeight: '600'
  },
  activeTabText: {
    color: 'white'
  },
  listContainer: {
    padding: 15
  },
  upcomingClassCard: {
    backgroundColor: '#E6F2FF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#007BFF'
  },
  completedClassCard: {
    backgroundColor: '#E6F6F0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#28A745'
  },
  classCardHeader: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 10
  },
  subjectText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  professorText: {
    color: '#666',
    fontSize: 14
  },
  classCardDetails: {
    flexDirection: 'column'
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5
  },
  detailText: {
    marginLeft: 10,
    color: '#666'
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyStateText: {
    marginTop: 15,
    color: '#A0A0A0',
    fontSize: 16
  }
});

export default ScheduleScreen;