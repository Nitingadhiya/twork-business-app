import React, {Component} from 'react';
import {WebView} from 'react-native-webview';
import {View, Text, BackHandler} from 'react-native';
import firebase from 'react-native-firebase';
import AsyncStorage from '@react-native-community/async-storage';

let self;
const INJECTEDJAVASCRIPT = `const meta = document.createElement('meta'); meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0'); meta.setAttribute('name', 'viewport'); document.getElementsByTagName('head')[0].appendChild(meta); `;

export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      canGoBack: false,
      loading: true,
      webURL: null,
    };
  }

  loadEnd() {
    this.setState({
      loading: false,
    });
  }

  componentDidMount() {
    console.log('Mount');
    self = this;
    BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
    const channel = new firebase.notifications.Android.Channel(
      'insider',
      'insider channel',
      firebase.notifications.Android.Importance.Max,
    );
    firebase.notifications().android.createChannel(channel);
    this.checkPermission();
    this.createNotificationListeners();
  }

  componentWillUnmount() {
    BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
  }

  handleBackPress = () => {
    if (this.state.canGoBack) {
      this.refWeb.goBack();
      return true;
    } else {
      //this.props.navigation.goBack(null);
    }
  };

  onNavigationStateChange(navState) {
    this.setState({
      canGoBack: navState.canGoBack,
    });
  }

  async getToken() {
    let fcmToken = await AsyncStorage.getItem('fcmToken');
    console.log('fcmTo', fcmToken);
    if (!fcmToken) {
      fcmToken = await firebase.messaging().getToken();
      console.log(fcmToken);
      if (fcmToken) {
        await AsyncStorage.setItem('fcmToken', fcmToken);
      }
    }
    console.log(fcmToken, 'fcmToken');
  }

  async checkPermission() {
    const enabled = await firebase.messaging().hasPermission();
    console.log(enabled, 'enabled');
    if (enabled) {
      this.getToken();
    } else {
      this.requestPermission();
    }
  }

  async requestPermission() {
    try {
      await firebase.messaging().requestPermission();
      this.getToken();
    } catch (error) {
      console.log('permission rejected');
    }
  }

  async createNotificationListeners() {
    firebase.notifications().onNotification(notification => {
      console.log('notification', notification);
      notification.android.setChannelId('insider').setSound('default');
      firebase.notifications().displayNotification(notification);
    });
    // Set up your listener
    firebase.notifications().onNotificationOpened(notificationOpen => {
      console.log(notificationOpen, 'notificationOpen');
      const notification = notificationOpen.notification;

      self.setState({
        webURL: notification.data && notification.data.webURL,
      });
      firebase
        .notifications()
        .removeDeliveredNotification(notification.notificationId);
      // notificationOpen.results.inputText will contain the text entered by the user
    });
  }

  render() {
    const {loading} = this.state;
    return (
      <View
        style={{
          height: '100%',
          width: '100%',
        }}>
        <WebView
          ref={myWeb => (this.refWeb = myWeb)}
          useWebKit={true}
          source={{uri: this.state.webURL || 'https://app.twork.io/login'}}
          style={{height: '100%', width: '100%'}}
          onLoadEnd={() => this.loadEnd()}
          originWhitelist={['*']}
          injectedJavaScript={INJECTEDJAVASCRIPT}
          onNavigationStateChange={navState => {
            if (navState.url === 'https://app.twork.io/login') {
              this.setState({
                loading: true,
              });
            }
            // Keep track of going back navigation within component
            this.setState({
              canGoBack: navState.canGoBack,
            });
          }}
        />
      </View>
    );
  }
}
