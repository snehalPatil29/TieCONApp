import React from 'react';
import {  View,Icon,Tab,TabHeading,Tabs } from 'native-base';
import { StyleSheet, FlatList, TouchableOpacity, Keyboard, Platform ,Alert, AsyncStorage,ScrollView,Text,Image } from 'react-native';
import { RkComponent, RkTheme, RkText, RkAvoidKeyboard,RkStyleSheet, RkButton, RkCard, RkTextInput } from 'react-native-ui-kitten';
import { NavigationActions } from 'react-navigation';
import { Service } from '../../../services';
import ReactMoment from 'react-moment';
import Moment from 'moment';
import { Avatar } from '../../../components';
import firebase from '../../../config/firebase';
import {GradientButton} from '../../../components/gradientButton';
import styleConstructor,{getStatusStyle}  from '../schedule/styles.js'
const questionTable = 'AskedQuestions';
var firestoreDB = firebase.firestore();
export default class AskQuestion extends RkComponent {
    constructor(props) {
        super(props);
          this.styles = styleConstructor();
        this.sessionDetails = this.props.navigation.state.params.sessionDetails;
        this.state = {
            Question: "",
            sessionDetails :this.sessionDetails ,
            currentUser: {},
            sessionId: this.sessionDetails.key,
            topQueView : false,
            recentQueView :true,
            questionData : [],
            orderBy : 'timestamp',
            currentUid : "",
            queAccess : "",
            questionStatus : false,
            AskQFlag : true
        }
    }
    componentWillMount() {
        let thisRef = this;
        Service.getCurrentUser((userDetails) => {
            thisRef.setState({
              currentUser: userDetails,
              currentUid : userDetails.uid
            });
          });
          this.checkSessionTime();
          this.getQuestions();
    }
    
    checkSessionTime = () => {
        let session = this.state.sessionDetails;
        let today = Moment(new Date()).format("DD MMM,YYYY hh:mm A");
        let sessionStart = Moment(session.startTime).format("DD MMM,YYYY hh:mm A");
        let sessionEnd = Moment(session.endTime).format("DD MMM,YYYY hh:mm A");
        let buffered = Moment(sessionEnd).add(2,'hours');
        let bufferedEnd = Moment(buffered).format("DD MMM,YYYY hh:mm A");

            if(sessionStart <= today && today <= bufferedEnd ){
                console.log("ifff")
                this.setState({
                    queAccess : 'auto',
                     AskQFlag: true
                })
            }
            else{
                console.log("else")
                this.setState({
                    queAccess : 'none',
                    AskQFlag: false
                })
                Alert.alert("Questions can be asked only when session is active")
            }
    }
    getQuestions = (order) => {
        if (order == undefined) {
            order = 'timestamp';
        }
        let sessionId = this.state.sessionId;
        let orderByObj = order;
        let thisRef = this;
        let Data = [];
        Service.getDocRef(questionTable)
        .where("SessionId" , "==" , sessionId )
        .orderBy(orderByObj , 'desc')
        .get()
        .then(function(docRef){
            if(docRef.size > 0){
                docRef.forEach(doc => {
                    Data.push({questionSet :doc.data(), questionId : doc.id});
                })
                thisRef.setState({questionData : Data ,  questionStatus :false})              
            }
            else{
                thisRef.setState({questionStatus : true})    
            }     
         })
         .catch(function (error){
            console.error("Error adding document: ", error);
         });
    }
    onSubmit = () => {
        let thisRef = this;
        let que = this.state.Question;
        let user = this.state.currentUser;
        let sessionId = this.state.sessionId;
        if (que.length !== 0) {
            firestoreDB.collection(questionTable)
            .add({
                    Question: que,
                    askedBy: user,
                    SessionId: sessionId,
                    timestamp : firebase.firestore.FieldValue.serverTimestamp(),
                    voters : [],
                    voteCount : 0
            })
            .then(function (docRef) {
                thisRef.setState({
                    Question: ""
                })
                Alert.alert("Question submitted successfully");
                thisRef.getQuestions();
            })
            .catch(function (error) {
                console.error("Error adding document: ", error);
            });
        }
        else {
            Alert.alert("Please fill the question field...");
        }
    }
    onChangeInputText = (text) => {
        let Question = text;
        this.setState({
            Question: Question
        })
    }
    displayQuestions = () =>{
        let questionList = this.state.questionData.map(question =>{
         let pictureUrl  
  
         let avatar;
        if (question.questionSet.askedBy.pictureUrl!=undefined) {
           avatar = <Image style={this.styles.avatarImage} source={{uri:question.questionSet.askedBy.pictureUrl}}/>
        } else {
            let firstLetter = question.questionSet.askedBy.firstName ?  question.questionSet.askedBy.firstName[0]: '?';
            avatar = <RkText rkType='big'  style={styles.avatar}>{firstLetter}</RkText>
        }
            let askedBy = question.questionSet.askedBy;
            let fullName = askedBy.firstName + " " + askedBy.lastName;
            var votesCount = question.questionSet.voteCount.toString();
            
            return(
                <View >
                    <RkCard style={{ marginLeft: 5, marginRight: 5, height: 125 }}>
                        <View style={{ flexDirection: 'row', marginLeft: 3, marginTop :5 }}>
                        
                             <View  style={{marginVertical :25,marginRight: 5}}>
                               {avatar}
                              </View>

                            <View style={{marginVertical :25}}>  
                                <Text style={{fontStyle: 'italic',fontSize: 12}}>{fullName}</Text>
                                <View>{this.getDateTime(question.questionSet.timestamp)}</View>
                            </View>
                           
                            <View style={{width : 150, flex: 1,flexDirection: 'column',justifyContent: 'center',marginLeft:5,marginRight:5}}>
                                <Text style={{fontSize: 14 }} >{question.questionSet.Question}</Text>
                            </View>
                            <View style={{ marginRight: 5 ,marginVertical :25}} >{this.checkLikeStatus(question)}
                               <Text style={{fontSize: 14 }}>{votesCount}</Text> 
                            </View>
                        </View>
                    </RkCard>
                </View>
            )
        })
        return questionList;
    }
    getDateTime = (queDateTime) => {
        let queDate = Moment(queDateTime).format("DD MMM,YYYY");
        let queTime = Moment(queDateTime).format("hh:mm A");
        return (
            <View>
            <Text style={{fontSize: 10 }}>{queDate}</Text>
            <Text style={{fontSize: 10 }}>{queTime}</Text>
            </View>
        );
    }
    checkLikeStatus = (question) => {
        let thisRef = this;
        let votes = question.questionSet.voteCount;
        let votersList = question.questionSet.voters;
        let voterStatus = false;
        votersList.forEach(voterId => {
            if(voterId == thisRef.state.currentUid){
                voterStatus = true;
            }
        })
        if(voterStatus == true){
            return(
                <Text style={{ fontSize: 25,width: 36,height : 36}}><Icon name="md-thumbs-up"  style={{ color : '#3872d1'}}/></Text>
            );
        }
        else{
            return(
                <Text  style={{ fontSize: 25,width: 36,height : 36}} onPress={() => this.onLikeQuestion(question)} ><Icon name="md-thumbs-up" style={{ color : '#8c8e91'}} /></Text> 
            )
        } 
    }
    onLikeQuestion = (question) => {
        let thisRef = this;
        let questionId = question.questionId;
        let likedBy  = question.questionSet.voters;
        likedBy.push(this.state.currentUid);
        let voteCount = likedBy.length;
        Service.getDocRef(questionTable)
        .doc(questionId)
        .update({
            "voters" : likedBy,
            "voteCount" : voteCount
        })
        .then(function (dofRef){
            thisRef.getQuestions();
        })
        .catch(function(err){
            console.log("err" + err);
        })
    }
    onTopQueSelect = () => {
        let order = 'voteCount';
        if(this.state.topQueView == false){
            this.setState({
                topQueView : true,
                recentQueView : false,
                orderBy : order
            })
            this.getQuestions(order);
        }
    }
    onRecentQueSelect = () => {
        if(this.state.recentQueView == false){
            let order = 'timestamp';
            this.setState({
                topQueView : false,
                recentQueView : true,
                orderBy : order
            })
            this.getQuestions(order);
        }
    }
    render() {
        return (
            <ScrollView>
                <RkAvoidKeyboard
                onStartShouldSetResponder={(e) => true}
                onResponderRelease={(e) => Keyboard.dismiss()}>
                
                  {this.state.AskQFlag &&
                  <View style={{flexDirection :'row'}} pointerEvents={this.state.queAccess}>
                    <RkTextInput type="text"  style={{width: 300, marginRight: 10 }}placeholder="Enter your question here..." value={this.state.Question} name="Question" onChangeText={(text) => this.onChangeInputText(text)} />
                    <RkText  style={{ fontSize: 35,width: 46,height : 46 , marginLeft : 8 }} onPress={() => this.onSubmit()}><Icon name="md-send"/> </RkText>
                  </View>
                  }
                  {!this.state.AskQFlag &&
                 <View style={{flexDirection :'row'}}>
                 <RkText style={{ fontSize:15,width:300,height: 46, marginRight: 10,marginLeft:4}}> Questions can be asked only when session is active... </RkText>
                 </View>
                 } 

                <View style={{ alignItems: 'center', flexDirection: 'row', width: Platform.OS === 'ios' ? 320 :  380, marginBottom: 3, marginLeft: 2, marginRight: 2 }}>
                    <View style={{ width: Platform.OS === 'ios' ? 160 :  180 }} >
                    <GradientButton colors={['#f20505', '#f55050']} text='Recent Questions'
                            contentStyle={{ fontSize: 18 }}
                            style={{ fontSize: 15, flexDirection: 'row', width:   Platform.OS === 'ios' ? 150 : 170, marginLeft: 2, marginRight: 1 }}
                            onPress={this.onRecentQueSelect}
                        />   
                    </View>
                    <View style={{  width: Platform.OS === 'ios' ? 160 :  180}} >
                    <GradientButton colors={['#f20505', '#f55050']} text='Top Questions'
                            contentStyle={{ fontSize: 18 }}
                            style={{ fontSize: 15, flexDirection: 'row', width:  Platform.OS === 'ios' ? 150 : 170, marginLeft: 1, marginRight: 2 }}
                            onPress={this.onTopQueSelect}
                        />
                    </View>
                </View>
                <View>
                    <View style={styles.section}>
                        <View style={[styles.row, styles.heading]}>
                            {
                                this.state.topQueView ? <RkText style={{ fontSize: 18 }} rkType='header6 primary'>Top</RkText> : null
                            }
                        </View>
                        <View style={[styles.row, styles.heading]}>
                            {
                                this.state.recentQueView ? <RkText style={{ fontSize: 18 }} rkType='header6 primary'>Recent</RkText> : null
                            }
                        </View>
                    </View>
                    <View style={[styles.row, styles.heading]}>
                            {
                                this.state.questionStatus ? <Text style={{ fontSize: 18 }}>No Questions Found...</Text> : null
                            }
                        </View>
                    {this.displayQuestions()}
                </View>
               
            </RkAvoidKeyboard>
            </ScrollView>
        );
    }
}

let styles = RkStyleSheet.create(theme => ({
    root: {
      backgroundColor: theme.colors.screen.base
    },
    section: {
      marginVertical: 5,
      marginBottom : 4
    },
    descSection : {
      marginVertical: 25,
      marginBottom : 10,
      marginTop : 5
    },
    subSection: {
      marginTop : 5,
      marginBottom :10
    },
    row: {
      flexDirection: 'row',
      paddingHorizontal: 17.5,
      borderColor: theme.colors.border.base,
      alignItems: 'center'
    },
    text :{
      marginBottom : 5,
      fontSize : 15,
      marginLeft: 20
    },
    surveButton :{
      alignItems: 'baseline',
      flexDirection: 'row',
      width: 380,
      marginTop: 8, 
      marginBottom: 3,
      marginLeft: 5,
      marginRight: 5 
    },
    avatar: {
        backgroundColor: '#C0C0C0',
        width: 40,
        height: 40,
        borderRadius: 20,
        textAlign: 'center',
        fontSize: 20,
        textAlignVertical: 'center',
        marginRight: 5
    }
  }));
