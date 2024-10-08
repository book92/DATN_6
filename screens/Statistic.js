import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { Searchbar, Divider, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Modal from 'react-native-modal';
import StaticList from './StaticList';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as XLSX from 'xlsx';
import RNFS from 'react-native-fs';
import { PermissionsAndroid } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyApBWUABXIusWxrlvdBt9ttvTd0uSISTQY',
  projectId: 'device-management-43211',
  storageBucket: 'device-management-43211.appspot.com',
  appId: 'com.device_management',
};


const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

const BLUE_COLOR = '#0000CD';
const BLACK_COLOR = '#000000';

const Statistic = () => {
  const navigation = useNavigation();
  const [roomCountsUser, setRoomCountsUser] = useState({});
  const [roomCountsDevice, setRoomCountsDevice] = useState({});
  const [userCount, setUserCount] = useState({});
  const [errorCount, setErrorCount] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState({
    roomCountsUser: {},
    roomCountsDevice: {},
    userCount: {},
    errorCount: {},
  });
  const [selectedBars, setSelectedBars] = useState({
    error: {},
    userByRoom: {},
    deviceByRoom: {},
    deviceByUser: {},
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedChartData, setSelectedChartData] = useState(null);
  const [showStaticList, setShowStaticList] = useState(false);


  const screenWidth = Dimensions.get('screen').width;
  const chartWidth = screenWidth * 0.92;
  const chartHeight = 300;

  useEffect(() => {
    const unsubscribeUserRoom = onSnapshot(collection(firestore, 'USERS'), (snapshot) => {
      const users = snapshot.docs.map((doc) => doc.data());

      const roomCountTempUser = {};

      users.forEach((user) => {
        roomCountTempUser[user.department] = (roomCountTempUser[user.department] || 0) + 1;
      });

      setRoomCountsUser(roomCountTempUser);
    });


    const unsubscribeDeviceRoom = onSnapshot(collection(firestore, 'DEVICES'), (snapshot) => {
      const devices = snapshot.docs.map((doc) => doc.data());

      const roomCountTempDevice = {};

      devices.forEach((device) => {
        roomCountTempDevice[device.departmentName] = (roomCountTempDevice[device.departmentName] || 0) + 1;
      });

      setRoomCountsDevice(roomCountTempDevice);
    });

    const unsubscribeDeviceUser = onSnapshot(collection(firestore, 'DEVICES'), (snapshot) => {
      const devices = snapshot.docs.map((doc) => doc.data());

      const UserCountTempDevice = {};

      devices.forEach((device) => {
        UserCountTempDevice[device.user] = (UserCountTempDevice[device.user] || 0) + 1;
      });

      setUserCount(UserCountTempDevice);
    });

    const unsubscribeErrors = onSnapshot(collection(firestore, 'ERROR'), (snapshot) => {
      const errors = snapshot.docs.map((doc) => doc.data());
      const errorCountTemp = {};

      errors.forEach((error) => {
        errorCountTemp[error.deviceName] = (errorCountTemp[error.deviceName] || 0) + 1;
      });

      setErrorCount(errorCountTemp);
    });

    return () => {
      unsubscribeUserRoom();
      unsubscribeDeviceRoom();
      unsubscribeDeviceUser();
      unsubscribeErrors();
    };
  }, []);

  useEffect(() => {
    const filterAndSortData = (data) => {
      const lowercaseQuery = searchQuery.toLowerCase();
      const filteredData = Object.entries(data).filter(([key]) =>
        key.toLowerCase().includes(lowercaseQuery)
      );
      return Object.fromEntries(
        filteredData.sort(([, a], [, b]) => b - a)
      );
    };

    setFilteredData({
      roomCountsUser: filterAndSortData(roomCountsUser),
      roomCountsDevice: filterAndSortData(roomCountsDevice),
      userCount: filterAndSortData(userCount),
      errorCount: filterAndSortData(errorCount),
    });
  }, [searchQuery, roomCountsUser, roomCountsDevice, userCount, errorCount]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    const filterAndSortData = (data) => {
      const lowercaseQuery = query.toLowerCase();
      const filteredData = Object.entries(data).filter(([key]) =>
        key.toLowerCase().includes(lowercaseQuery)
      );
      return Object.fromEntries(
        filteredData.sort(([, a], [, b]) => b - a)
      );
    };


    setFilteredData({
      roomCountsUser: filterAndSortData(roomCountsUser),
      roomCountsDevice: filterAndSortData(roomCountsDevice),
      userCount: filterAndSortData(userCount),
      errorCount: filterAndSortData(errorCount),
    });
  };


  const wrapLabel = (label, maxWidth) => {
    const words = label.split(' ');
    let lines = [];
    let currentLine = '';

    words.forEach(word => {
      if (currentLine.length + word.length <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    });
    lines.push(currentLine);

    return lines.join('\n');
  };

  const createChartData = (data) => {
    const labels = Object.keys(data);
    const maxLabelWidth = 20; // Áp dụng cho tất cả các biểu đồ
    const wrappedLabels = labels.map(label => wrapLabel(label, maxLabelWidth));
    return {
      labels: wrappedLabels,
      datasets: [
        {
          data: Object.values(data),
          color: (opacity = 1) => `rgba(0, 0, 205, ${opacity})`,
        },
      ],
    };
  };


  const dataErrorDevice = createChartData(filteredData.errorCount);
  const dataRoomCountsUser = createChartData(filteredData.roomCountsUser);
  const dataDeviceRoom = createChartData(filteredData.roomCountsDevice);
  const dataDeviceUser = createChartData(filteredData.userCount);

  const handleChartPress = (chartType, label, value) => {
    const chartData = {
      type: chartType,
      label: label,
      value: value,
      deviceName: chartType === 'error' ? label : null,
      department: ['userByRoom', 'deviceByRoom'].includes(chartType) ? label : null,
      user: chartType === 'deviceByUser' ? label : null
    };
    setSelectedChartData(chartData);
    setModalVisible(true);
  };

  const handleCloseStaticList = () => {
    setShowStaticList(false);
  };

  const handleExportToExcel = (data, title) => {
    Alert.alert(
      "Xuất Excel",
      "Bạn muốn xuất excel bảng thông kê?",
      [
        {
          text: "Hủy",
          style: "cancel"
        },
        { 
          text: "Xác nhận", 
          onPress: () => exportToExcel(data, title)
        }
      ]
    );
  };

  const requestStoragePermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Storage permission granted');
        return true;
      } else {
        console.log('Storage permission denied');
        return false;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const exportToExcel = async (data, title) => {
    console.log('Starting Excel export...');
    try {
      console.log('Preparing Excel data...');
      // Prepare data for Excel
      const excelData = [
        ['Label', 'Value'], // Header row
        ...Object.entries(data)
      ];
      console.log('Excel data prepared:', excelData);

      console.log('Creating worksheet...');
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      console.log('Worksheet created');

      console.log('Creating workbook...');
      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      console.log('Workbook created');

      console.log('Generating Excel file...');
      // Generate Excel file
      const wbout = XLSX.write(wb, { type: 'binary', bookType: "xlsx" });
      console.log('Excel file generated');

      // Define file name
      const fileName = `${title.replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`;
      console.log('File name:', fileName);

      if (Platform.OS === 'android') {
        console.log('Saving file on Android...');
        const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
        console.log('File path:', filePath);

        // Write file
        await RNFS.writeFile(filePath, wbout, 'ascii');
        console.log('File written successfully');

        // Notify user
        Alert.alert('Thành công', `File đã được lưu vào thư mục Downloads với tên ${fileName}`);
      } else {
        console.log('Device is not Android, skipping file save');
        Alert.alert('Thông báo', 'Tính năng này chỉ khả dụng trên Android');
      }
    } catch (error) {
      console.error('Error in Excel export:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi xuất file Excel.');
    }
  };

  const renderChart = (data, title, chartType) => {
    const barWidth = chartWidth / data.labels.length;

    return (
      <>
        <View style={styles.legendContainer}>
          <Text style={styles.titleText}>{title}</Text>
          <IconButton
            icon={({ size, color }) => (
              <Icon name="microsoft-excel" size={size} color={color} />
            )}
            size={24}
            onPress={() => handleExportToExcel(data, title)}
            style={styles.exportButton}
            color={BLUE_COLOR}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <BarChart
              data={data}
              width={Math.max(chartWidth, data.labels.length * 120)}
              height={chartHeight}
              chartConfig={{
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                color: (opacity = 1) => `rgba(0, 0, 205, ${opacity})`,
                labelColor: (opacity = 1) => BLUE_COLOR,
                propsForLabels: {
                  fontSize: 8,
                  width: 120,
                  alignmentBaseline: 'middle',
                  fill: BLUE_COLOR,
                },
              }}
              verticalLabelRotation={0}
              horizontalLabelRotation={-45} // Xoay nhãn để có nhiều không gian hơn
              yAxisLabel=""
              yAxisSuffix=""
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              fromZero={true}
              showValuesOnTopOfBars={true}
            />
            <View style={[styles.overlayContainer, { width: Math.max(chartWidth, data.labels.length * 120) }]}>
              {data.labels.map((label, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.overlayLabel,
                    {
                      left: index * barWidth,
                      width: barWidth,
                      height: chartHeight,
                    },
                  ]}
                  onPress={() => handleChartPress(chartType, label, data.datasets[0].data[index])}
                >
                  <View style={styles.touchableArea} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
        <Divider />
      </>
    );
  };


  return (
    <ScrollView style={styles.container}>
      <Searchbar
        placeholder="Tìm kiếm"
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchBarInput}
        iconColor={BLUE_COLOR}
        placeholderTextColor={BLUE_COLOR}
        theme={{ colors: { primary: BLUE_COLOR } }}
      />
      {renderChart(dataErrorDevice, "Thống kê lỗi theo thiết bị", "error")}
      {renderChart(dataRoomCountsUser, "Thống kê người dùng theo phòng", "userByRoom")}
      {renderChart(dataDeviceRoom, "Thống kê thiết bị theo phòng", "deviceByRoom")}
      {renderChart(dataDeviceUser, "Thống kê thiết bị theo người dùng", "deviceByUser")}
      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => setModalVisible(false)}
        onBackButtonPress={() => setModalVisible(false)}
        style={{ margin: 0 }}
      >
        <View style={{ flex: 1, backgroundColor: 'white' }}>
          {selectedChartData && (
            <StaticList
              chartData={selectedChartData}
              onClose={() => setModalVisible(false)} // Ensure this is set correctly
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  colorBox: {
    width: 20,
    height: 20,
    marginHorizontal: 5,
  },
  legendText: {
    fontSize: 16,
    color: BLUE_COLOR,
  },
  searchBar: {
    marginBottom: 10,
    marginHorizontal: 10,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: BLUE_COLOR,
  },
  searchBarInput: {
    color: BLUE_COLOR,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BLUE_COLOR,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  overlayLabel: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchableArea: {
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: BLUE_COLOR,
  },
  deviceList: {
    maxHeight: 300,
  },
  deviceItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceInfo: {
    fontSize: 14,
    color: 'gray',
  },
  closeButton: {
    marginTop: 10,
    backgroundColor: BLUE_COLOR,
  },
  chartContainer: {
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: BLUE_COLOR,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
    paddingRight: 40,
    marginLeft: 10,
    marginBottom: 50, // Tăng margin bottom để tạo không gian cho nhãn xoay
  },
  touchableBarContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 50, // Điều chỉnh bottom để phù hợp với margin bottom của chart
    paddingLeft: 30,
  },
  touchableBar: {
    height: '100%',
    width: 60, // Đảm bảo độ rộng này khớp với barWidth trong renderChart
  },
  exportButton: {
    margin: 0,
  },
  exportButtonLabel: {
    color: 'white',
    fontSize: 12,
  },
});
export default Statistic;