import { StyleSheet, Dimensions } from 'react-native';
import { TextInput } from 'react-native-paper';

const { width } = Dimensions.get('window');
const pxToDp = (px) => px * (width / 390);
const styles = StyleSheet.create ({
// global container
container: {
    flex: 1,
    backgroundColor: '#F5E4C3',
    padding: pxToDp(20),
    justifyContent: 'center',
    alignItems: 'center'
  },
// arrow back
backButton:{
 position: 'absolute',
 top: 70,
 left: 20,
zIndex: 100,
},
// general text
primaryText:{
    width: pxToDp(350),
    height: pxToDp(150),
    color: '#000',
    textAlign: 'center', 
    fontFamily: 'Quicksand_700Bold',
    fontSize: pxToDp(40),
    marginVertical: pxToDp(30),
    alignItems: 'center',
    justifyContent: 'center'
},
secondaryText:{
  width: '100%',
  color: '#000',
  textAlign: 'center',
  fontFamily: 'Quicksand_500Meduim',
  fontSize: pxToDp(18),
  marginBottom: pxToDp(10),
},
// leaf container if i have a scrollable view
leafContainer:{
  flex: 1,
  position: 'absolute',
  width: '100%',
  height: '100%',

},
topScrollLeaf:{
  width: 200,
  height: 200,
  transform: [{ rotate: '91.171deg' }],
  top: -10,
  left: -25,
  position: 'absolute',
  resizeMode: 'contain'
},
bottomScrollLeaf:{
  width: 200,
  height: 200,
  transform: [{ rotate: '91.171deg' }, {scaleY: -1}, {scaleX: -1}],
  bottom: 0,
  right: -1,
  position: 'absolute',
  resizeMode: 'contain'
},
// needed Leaf for general layout
topLeaf:{
  width: 200,
  height: 200,
  transform: [{ rotate: '91.171deg' }],
  top: -3,
  left: -14,
  position: 'absolute',
  resizeMode: 'contain'
},
bottomLeaf:{
  width: 200,
  height: 200,
  transform: [{ rotate: '91.171deg' }, {scaleY: -1}, {scaleX: -1}],
  bottom: -3,
  right: -14,
  position: 'absolute',
  resizeMode: 'contain'
},

// user input
input:{
  width: '100%',
  height: 50,
  backgroundColor: '#fff',
  borderRadius: 15,
  paddingLeft: 15,
  fontSize: 16,
  marginBottom: 15,
  borderWidth: 1,
  borderColor: '#ccc',
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: pxToDp(10),
  elevation: 5,
  shadowOffset: { width: 0, height: pxToDp(2) }
},
//any primary button
buttonContainer:{
  width: '100%',
  alignItems: 'center',
  marginTop: pxToDp(30), 
  paddingBottom: pxToDp(20)
},
button: {
  width: pxToDp(280),
  height: pxToDp(60),
  borderRadius: pxToDp(20),
  backgroundColor: '#2E4A32',
  alignItems: 'center',
  justifyContent: 'center',
  alignSelf: 'center',
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: pxToDp(10),
  elevation: 5,
  shadowOffset: { width: 0, height: pxToDp(2) },
  overflow: 'hidden'
},
textButton: {
  color: 'white',
  fontFamily: 'Quicksand_700Bold',
  fontSize: 21
  },
//Name Screen orange
orange: {
    width: pxToDp(150), 
    height: pxToDp(150),
    resizeMode: 'contain',
    alignSelf: 'center',
    marginVertical: pxToDp(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: pxToDp(4) },
    shadowOpacity: 0.2,
    shadowRadius: pxToDp(10),
    elevation: 5, 
    
  },
orangeContainer: {
  alignItems: 'center',
  justifyContent: 'center'
},
// Divider
Divider: {
        width: '90%',
        height: pxToDp(1),
        backgroundColor: '#000',
        alignSelf: 'center',
        
      },
//leaf + divider
DivLeafContainer:{
   alignItems: 'center',
   position: 'relative',
   marginVertical: pxToDp(16)

},
twoLeafs:{
  position: 'absolute',
  resizeMode: 'contain'
},
//User type Buttons
clientButton:{
  width: pxToDp(280),
  paddingVertical: (10),
  borderRadius: pxToDp(20),
  backgroundColor: '#88A76C',
  alignSelf: 'center',
  shadowColor: '#000',
  shadowOpacity: 0.4,
  shadowRadius: pxToDp(10),
  elevation: 10,
  shadowOffset: { width: 0, height: pxToDp(2) },
  overflow: 'hidden'
},
proButton:{
  width: pxToDp(280),
  paddingVertical: (20),
  borderRadius: pxToDp(20),
  backgroundColor: '#FCCF94',
  alignSelf: 'center',
  marginVertical: pxToDp(30),
  shadowColor: '#000',
  shadowOpacity: 0.4,
  shadowRadius: pxToDp(10),
  elevation: 10,
  shadowOffset: { width: 0, height: pxToDp(2) },
  overflow: 'hidden'
}, 
buttonUserContainer:{
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  gap: pxToDp(8),
  flexShrink: 1,
},
userText:{
  width: '100%',
  color: '#000', 
  fontFamily: 'Quicksand_700Bold',
  fontSize: pxToDp(19),
  flexWrap: 'wrap',
  textAlign: 'center'
  
},
textWrapper:{
  alignItems: 'center',
  justifyContent: 'center',
},
//banana
banana:{
  width: pxToDp(40),
  height: pxToDp(40),
  transform: [{ rotate: '176.64deg' }, {scaleY: -1}],
  
},
//goal screen style 
// option buttons
optionsContainer: {
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  gap: pxToDp(50)
},

optionButton: {
  width: '90%',
  paddingVertical: pxToDp(15),
  backgroundColor: '#FFFF',
  borderRadius: pxToDp(20),
  alignItems: 'center',
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: pxToDp(5),
  elevation: 5,
},

selected: {
  backgroundColor: '#88A76C', 
},

optionText: {
  fontSize: pxToDp(18),
  fontFamily: 'Quicksand_400Regular',
  color: '#000',
},
goalText:{
  width: pxToDp(350),
  height: pxToDp(80),
  color: '#000',
  textAlign: 'center', 
  fontFamily: 'Quicksand_700Bold',
  fontSize: pxToDp(20),
  alignItems: 'center',
  justifyContent: 'center'
},
helloText:{
  width: '100%',
  height: pxToDp(100),
  color: '#000',
  textAlign: 'center', 
  fontFamily: 'Quicksand_700Bold',
  fontSize: pxToDp(40),
  marginVertical: pxToDp(30),
  alignItems: 'center',
  justifyContent: 'center'
},
//Setting Profile screen 
genderContainer: {
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  gap: pxToDp(15)},
genderButton: {
  width: '30%',
  paddingVertical: pxToDp(15),
  backgroundColor: '#FFFF',
  borderRadius: pxToDp(15),
  alignItems: 'center',
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: pxToDp(5),
  elevation: 5,
},

SwitchContainer:{
  flexDirection: 'row',
  justifyContent: 'center',
  marginVertical: pxToDp(15),
  overflow: 'hidden',
  backgroundColor: '#F5E4C3',
  height: pxToDp(47),
 
},
switchActiveButton:{

  justifyContent: "center",
  borderWidth:1,
  borderColor: '#4A4459',
  width: '30%',
  paddingVertical: pxToDp(15),
  alignItems: 'center',
  borderTopLeftRadius: pxToDp(25),
  borderBottomLeftRadius: pxToDp(25),
},
switchInactiveButton:{
 
  justifyContent: "center",
  borderWidth: 1,
  borderColor: '#4A4459',
  width: '30%',
  paddingVertical: pxToDp(15),
  alignItems: 'center',

  borderTopRightRadius: pxToDp(25),
  borderBottomRightRadius: pxToDp(25),
},
selectedUnit:{
  backgroundColor: '#2E4A32',
},
optionUnitText: {
  fontSize: pxToDp(12),
  fontFamily: 'Quicksand_600SemiBold',
  color: '#000',
  textAlign: 'center',
  includeFontPadding: false,
},
//scrolable rule 

  rulerContainer: {
    alignItems: "center",
    backgroundColor: "#F5E4C3",
    paddingTop: 50,
    position: "relative",
  },
  selectedValue: {
    fontSize: 32, 
    fontWeight: "bold",
    marginBottom: 10,
  },
  rulerItem: {
    width: 25, //  Increased width for better spacing
    alignItems: "center",
    justifyContent: "flex-end", //  Ensures numbers align properly
  },
  rulerText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 5, //  Creates space between text & tick marks
  },
  line: {
    width: 2,
    height: 15,
    backgroundColor: "#ccc",
  },
  activeLine: {
    height: 30, //  Taller line for selected value
    backgroundColor: "black",
  },
  centerIndicator: {
  position: "absolute",
  left: "50%",
  width: 3, //  Slightly thicker for better visibility
  height: 55, //  Increased height to align properly
  backgroundColor: "black",
  transform: [{ translateX: -1.5 }], //  Moves it perfectly to the center
  bottom: -3,
},
//Motivational Screen
// cute apple 
cuteApple:
{width: pxToDp(170  ),
  height: pxToDp(160),
  justifyContent: 'center',
  alignItems: 'center',
  resizeMode: 'contain',
  marginVertical: pxToDp(18),
},
greenText:{
  color: '#4F7B4A',
  marginVertical: pxToDp(60),
  fontWeight: 'Quicksand_700Bold',
},
motivText:{
fontSize: pxToDp(35),
},
// transformationScreen 
optionsTransformationContainer: {
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  gap: pxToDp(15)},
optionTransformationText: {
    fontSize: pxToDp(16),
    fontFamily: 'Quicksand_500Medium',
    color: '#000',
    textAlign: 'center',
  },
  transformationText:{
    width: pxToDp(350),
    height: pxToDp(140),
    color: '#000',
    textAlign: 'center', 
    fontFamily: 'Quicksand_700Bold',
    fontSize: pxToDp(30),
    alignItems: 'center',
    justifyContent: 'center'
  },
  //TransformationScreen Popup 
  popup:{
    borderTopLeftRadius: pxToDp(20),
    borderTopRightRadius: pxToDp(20),
    width: '100%',
    height: '50%',
    backgroundColor: '#88A76C',
    justifyContent: 'center',
    alignItems: 'center',
   },
  smallPear:{
    height: pxToDp(100),
    width: pxToDp(100),
    resizeMode: 'contain',
    marginVertical: pxToDp(25),
  },
  mainText:{
    textAlign: 'center',
    color: 'white',
    fontFamily: 'Quicksand_700Bold',
    fontSize: pxToDp(25),
    marginVertical: pxToDp(20),
  },
  popupSubText:{
      textAlign: 'center',
      color: 'white',
      fontFamily: 'Quicksand_500Meduim',
      fontSize: pxToDp(18),
      marginVertical: pxToDp(20),
  },
  popupContainer:{
    flex: 1,
    justifyContent: 'flex-end',
  },
  //gratitude screen
  GratitudeText:{
    textAlign: 'center',
    color: '#000000',
    fontFamily: 'Quicksand_700Bold',
    fontSize: pxToDp(35),
    marginVertical: pxToDp(20),
  },
  GratitudeSubText:{
    textAlign: 'center',
    color: '#4F7B4A',
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: pxToDp(30),
    marginVertical: pxToDp(20),
  },
  // signUp
  SignUpText:{
    textAlign: 'center',
    color: '#000000',
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: pxToDp(25),
   
  },
  passwordContainer: {
          flexDirection: 'row',
          marginBottom: 15,
          alignItems: 'center',
          width: '100%',
          backgroundColor: '#fff',
          borderRadius: 15,
          borderWidth: 1,
          borderColor: '#ccc',
          height: 50,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: pxToDp(10),
          elevation: 5,
          shadowOffset: { width: 0, height: pxToDp(2) }
        },
passwordInput: {
          flex: 1,
          height: '100%',
          paddingLeft: 15,
          fontSize: 16,
          
        },
eyeIcon: {
          padding: 10,
          marginRight: 10,
        },
reset: {
          color: '#4F7B4A', 
          fontFamily: 'Quicksand_700Bold',
          fontSize: pxToDp(15),
          textDecorationLine: 'underline'
  
        },
Divider: {
          width: '80%',
          height: pxToDp(1),
          backgroundColor: '#000',
          alignSelf: 'center',
          marginVertical: pxToDp(20)
        },
  fruit:{
  width: '70%',
  height: pxToDp(160),
  justifyContent: 'center',
  alignItems: 'center',
  resizeMode: 'contain',
  marginVertical: pxToDp(10),
  },
  //dietary
  dietaryText:{
    width: pxToDp(350),
    height: pxToDp(140),
    color: '#000',
    textAlign: 'center', 
    fontFamily: 'Quicksand_700Bold',
    fontSize: pxToDp(30),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: pxToDp(50),
  },
  //main container 
  mainContainer: {
    flex: 1,
    backgroundColor: '#F5E4C3',
  
  },
  // header component
  header:{
    width: '100%',
    backgroundColor: '#88A76C',
    paddingTop: pxToDp(35),
    paddingHorizontal: pxToDp(16),
    justifyContent: 'center',
   
  },
  topRow:{
    flexDirection: 'row',
    alignItems: "center",
    width: '100%',
    justifyContent: 'space-between',
  },
  appName:{
    color: '#000',
    textAlign: 'center', 
    fontFamily: 'Quicksand_700Bold',
    fontSize: pxToDp(40),
    
  },
  subText:{
    color: '#000',
    textAlign: 'center', 
    fontFamily: 'Quicksand_500Medium',
    fontSize: pxToDp(18),
    marginBottom: pxToDp(10),	
    
  },
  headerLogo:{
    width: pxToDp(60),
    height: pxToDp(60),
    resizeMode: 'contain',
    marginRight: pxToDp(10),
  },
  //tabNavigation
  tabNavigation:{
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#88A76C',
    alignItems: 'center',
    position: 'absolute',
    width: '100%',
    bottom: 0,
    height: pxToDp(60),
    zIndex: 100,
  },
 bot:{
  width: pxToDp(25),
  height: pxToDp(25),
  resizeMode: 'contain',
 },
 //chart container 
 chartContainer:{
  backgroundColor: '#FCCF94',
  borderRadius: pxToDp(20),
  justifyContent: 'center',
  marginVertical: pxToDp(20),
  paddingVertical: pxToDp(20),
  paddingHorizontal: pxToDp(8),
  width: '95%',
 },
 caloriesText:{
  color: '#000',
  textAlign: 'left', 
  fontFamily: 'Quicksand_600SemiBold',
  fontSize: pxToDp(18),
  paddingLeft: pxToDp(10),},
 caloriesSubText:{
  color: '#2E4A32',
  textAlign: 'left', 
  fontFamily: 'Quicksand_400Regular',
  fontSize: pxToDp(14),
  paddingLeft: pxToDp(10),
 },
 goalText:{
  color: '#2E4A32',
  textAlign: 'left', 
  fontFamily: 'Quicksand_600SemiBold',
  fontSize: pxToDp(13),
  marginVertical: pxToDp(10),
 },
 goalSubText:{
  color: '#000',
  textAlign: 'left', 
  fontFamily: 'Quicksand_600SemiBold',
  fontSize: pxToDp(13),
  marginVertical: pxToDp(10),
 },
 //Home component
 buttonHomeContainer:{
  flexDirection: 'column',
  justifyContent: 'center',
  gap: pxToDp(10),
  width: '95%',
 },
 homeButton:{
  justifyContent: 'center',
  backgroundColor: '#FCCF94',
  borderRadius: pxToDp(20),
  height: pxToDp(55),
 },
 buttonHomeText:{
  color: '#2E4A32',
  fontFamily: 'Quicksand_700Bold',
  fontSize: pxToDp(15),
  textAlign: 'left',
  paddingHorizontal: pxToDp(18),
 }, 
 addIcon:{
  marginRight: pxToDp(18),

},
sportyPear:{
  width: pxToDp(50),
  height: pxToDp(50),
  resizeMode: 'contain',
  marginHorizontal: pxToDp(10),
  
},
activityContainer:{
    backgroundColor: '#FCCF94',
    borderRadius: pxToDp(20),
    justifyContent: 'center',
    marginTop: pxToDp(25),
    marginBottom: pxToDp(80),
    width: '95%',
},
// activity log screen 
pickerContainer:{
  margin: pxToDp(10),
  backgroundColor: '#FCCF94',
  borderRadius: pxToDp (20),
  overflow: 'hidden',
},
picker:{
  color: '#2E4A32',
},
inputDuration:{
    flex: 1,
    padding: pxToDp(10),
    borderRightWidth: 1,
    borderRightColor: '#ccc',
}, 
//recipes Screen 
searchContainer:{
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: pxToDp(13),
  backgroundColor: '#FCCF94',
  borderRadius: pxToDp(20),
  width: '90%',
  marginTop: pxToDp(15),
  marginHorizontal: pxToDp(20),
  
  height: pxToDp(40),
}, 
//nutritionForm
TextInput:{
  color: '#000',
  fontFamily: 'Quicksand_500Meduim',
  fontSize: pxToDp(8),
 
  borderRadius: 15,
},
bioInput:{
  width: '100%',
  height: 100,
  backgroundColor: '#fff',
  borderRadius: 15,
  paddingLeft: 15,
  marginBottom: 15,
  borderWidth: 1,
  borderColor: '#ccc',
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: pxToDp(10),
  elevation: 5,
  shadowOffset: { width: 0, height: pxToDp(2) }},
googleButton: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  fbButton: {
    backgroundColor: '#4267B2', 
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 5,
  },
  signInContainer:{
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: pxToDp(30),
   
  }, 
  //home screen 
  remainingValue:{
    fontFamily: 'Quicksand_700Bold',
    marginBottom: pxToDp(10)
  },
  remaining:{
    fontFamily: 'Quicksand_600SemiBold',
    color: '#2E4A32'
  },
  chartText:{
    color: 'white',
    fontFamily: 'Quicksand_700Bold',
    fontSize: pxToDp(15)
  },
  // add meal screen
  addText:{
    fontFamily: 'Quicksand_700Bold',
    fontSize: pxToDp(20),
    
  },
  //scanning button 
  analyzeButton:{
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor:'#FCCF94',
    borderRadius: 20,
    paddingVertical: 8,
    marginVertical: 25, 
    paddingHorizontal: 8, 
    width: '85%', 
    height: 55,
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  // reset screen
  subNameText:{
    color:'#4F7B4A',
    textAlign: 'center',
    fontFamily: 'Quicksand_700Bold',
    fontSize: pxToDp(15),
    marginVertical: pxToDp(15),
    
  
    },
    resetText:{
      color: '#000',
      textAlign: 'center', 
      fontFamily: 'Quicksand_700Bold',
      fontSize: pxToDp(30),
      marginVertical: pxToDp(20),
    },
    //card
    cardContainer:{
      flex: 1,
      alignItems: 'left',
      backgroundColor: '#FCCF94',
      borderRadius: pxToDp(20),
      width: '90%',
      height: pxToDp(270),
      marginVertical: pxToDp(10),
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: pxToDp(10),
      elevation: 5,
      shadowOffset: { width: 0, height: pxToDp(2) },
      marginHorizontal: pxToDp(20),
    }, 
    cardImage:{
      width: '100%',
      height: '65%',
      resizeMode: 'cover',
      borderTopLeftRadius: pxToDp(20),
      borderTopRightRadius: pxToDp(20),
    },
    cardTitle:{
      color: '#000',
      textAlign: 'center', 
      fontFamily: 'Quicksand_700Bold',
      fontSize: pxToDp(20),
      paddingLeft: pxToDp(10),
      marginVertical: pxToDp(10)
    },
    cardDescription:{
      color: '#000',
      textAlign: 'center', 
      fontFamily: 'Quicksand_500Medium',
      fontSize: pxToDp(15),
      paddingLeft: pxToDp(10),
      marginVertical: pxToDp(10)
    },
    cardCalories:{
      color: '#000',
      textAlign: 'center', 
      fontFamily: 'Quicksand_500Medium',
      fontSize: pxToDp(15),
      paddingLeft: pxToDp(10),
    },
    arrowRecipes:{
      position: 'absolute',
      bottom: 10,
      right: 10,
    },
    cardRating:{
      flexDirection: 'row',
      justifyContent: 'flex-start',
      paddingLeft: pxToDp(10),
      marginVertical: pxToDp(10),
      alignSelf: "center"
    },
  //nutritionist card 
cardNutritionistContainer:{
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#FCCF94',
  borderRadius: pxToDp(20),
  width: '90%',
  height: pxToDp(170),
  marginVertical: pxToDp(10),
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: pxToDp(10),
  elevation: 5,
  shadowOffset: { width: 0, height: pxToDp(2) },
  marginHorizontal: pxToDp(20),
  paddingHorizontal: pxToDp(10),
},
cardNutritionistImage:{
  width: 150, 
  height: 150,
  borderRadius: 75,
  resizeMode: 'cover',

},
specializationText:{
    color: '#2E4A32',
    textAlign: 'center', 
    fontFamily: 'Quicksand_500Medium',
    fontSize: pxToDp(15),
    paddingLeft: pxToDp(10),
  },
// Nutrition info screen 
nutritionistName:{
  fontFamily: 'Quicksand_700Bold',
  fontSize: pxToDp(20),
  marginBottom: pxToDp(10),

},
nutritionistSpecialization:{
  fontFamily: 'Quicksand_500Medium',
  fontSize: pxToDp(16),
  marginBottom: pxToDp(10),
},
nutritionistWorkplace:{
  fontFamily: 'Quicksand_500Medium',
  fontSize: pxToDp(16),
  marginBottom: pxToDp(10),
}, 
littleOrange:{
   width: 50,
   height: 50, 
   alignSelf: 'center'
}, 
//message and guidance 
buttons:{
  backgroundColor:'#FCCF94',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 20,
  marginVertical: 20, 
  width: '90%', 
  height: 55,
  elevation: 2, 
  shadowColor: '#000', 
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 2,
},
messageContainer:{
  alignItems: 'center'
},
RatingEntry:{

  fontFamily: 'Quicksand_600SemiBold',
  fontSize: pxToDp(22),

  marginVertical: pxToDp(10)
},
settingsButton:{
  width: '90%',
  height: pxToDp(50),
  borderRadius: pxToDp(20),
  backgroundColor: '#FCCF94',
  alignItems: 'center',
  justifyContent: 'center',
  alignSelf: 'center',
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: pxToDp(10),
  elevation: 5,
  shadowOffset: { width: 0, height: pxToDp(2) },
  marginVertical: pxToDp(10)
},
// estimation screen
containerEstim: {
  flexGrow: 1,
  backgroundColor: '#F5E4C3',
  paddingHorizontal: 24,
  paddingTop: 80,
  paddingBottom: 40,
  position: 'relative',
},
loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#F5E4C3',
},
loadingAnimation: {
  width: 300,
  height: 300,
},
loadingText: {
  marginTop: 20,
  fontSize: 16,
  color: '#2E4A32',
  fontFamily: 'Quicksand_600SemiBold',
},
cardTitleEstim: {
  fontSize: 30,
  fontFamily: 'Quicksand_700Bold',
  color: 'black',
  textAlign: 'center',
  marginBottom: 40,
  letterSpacing: 0.5,
},
userCardEstim: {
  backgroundColor: '#FCCF94',
  borderRadius: 20,
  padding: 20,
  marginBottom: 35,
  shadowColor: '#2E4A32',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 5,
},
userNameEstim: {
  fontSize: 20,
  fontFamily: 'Quicksand_600SemiBold',
  color: '#2E4A32',
  marginBottom: 8,
},
userStats: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},
statText: {
  fontSize: 14,
  color: '#5E5E5E',
  fontFamily: 'Quicksand_600SemiBold',
},
targetsCard: {
  backgroundColor: '#FCCF94',
  borderRadius: 16,
  padding: 25,
  marginBottom: 30,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 3,
},
cardHeaderEstim: {
  fontSize: 20,
  fontFamily: 'Quicksand_600SemiBold',
  color: '#2E4A32',
  marginBottom: 20,
  borderBottomWidth: 2,
  borderBottomColor: 'gray',
  paddingBottom: 10,
},
targetRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#F0F0F0',
},
metricLabel: {
  flexDirection: 'row',
  alignItems: 'center',
},
metricIcon: {
  marginRight: 10,
},
labelText: {
  fontSize: 16,
  color: '#555',
  fontFamily: 'Quicksand_600SemiBold',
},
targetValue: {
  fontSize: 16,
  fontFamily: 'Quicksand_700Bold',
  color: '#2E4A32',
},
fiberRow: {
  marginTop: 10,
  paddingTop: 12,
  borderTopWidth: 1,
  borderTopColor: '#E0E0E0',
},
fiberGoalEs: {
  flexDirection: 'row',
  alignItems: 'center',
},
goalRange: {
  fontSize: 13,
  color: '#888',
  marginLeft: 5,
  fontFamily: 'Quicksand_600SemiBold',
},
actionButton: {
  backgroundColor: '#2E4A32',
  borderRadius: 12,
  paddingVertical: 16,
  paddingHorizontal: 24,
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#2E4A32',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 5,
},
buttonTextEstim: {
  color: 'white',
  fontFamily: 'Quicksand_600SemiBold',
  fontSize: 16,
  letterSpacing: 0.5,
},
buttonIconEstim: {
  marginLeft: 8,
},
// card for recipes :
cardRecipeTitle:{
  color: '#000',
  textAlign: 'center', 
  fontFamily: 'Quicksand_700Bold',
  fontSize: pxToDp(20),
  paddingLeft: pxToDp(10),
  marginVertical: pxToDp(10)
},
cardRecipeDescription:{
  color: '#000',
  textAlign: 'center', 
  fontFamily: 'Quicksand_600SemiBold',
  fontSize: pxToDp(15),
  paddingLeft: pxToDp(10),
  marginBottom: pxToDp(5)
}, 
cardRecipeContainer:{
  flex: 1,
  alignItems: 'center',

  backgroundColor: '#FCCF94',
  borderRadius: pxToDp(20),
  width: '90%',
  height: pxToDp(350),
  marginVertical: pxToDp(13),
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: pxToDp(10),
  elevation: 5,
  shadowOffset: { width: 0, height: pxToDp(2) },
  marginHorizontal: pxToDp(20),
  padding: pxToDp(10),
}, 
// Recipe Details screen 
cardReImage: {
  width: '100%',
  height: 250,
  borderRadius: 10,
},
contentContainer: {
  padding: 20,
  backgroundColor: '#F5E4C3',
},
titlerRecipe: {
  fontSize: 24,
  fontFamily: 'Quicksand_700Bold',
  marginVertical: 10,
  textAlign: 'center',
},
section: {
  marginVertical: 10,
  
},
sectionHeader: {
  backgroundColor: '#FCCF94', 
  padding: 10,
  borderRadius: 20,
  marginVertical: 10,
},
nutrientTitle: {
  fontSize: 16,
  color: '#2E4A32', 
  fontFamily: 'Quicksand_700Bold',
},
nutrientValue: {
  fontSize: 16,
  color: '#000', 
  fontFamily: 'Quicksand_600SemiBold',
},
mealTypeRecipe: {
  fontSize: 18,
  color: '#2E4A32', 
  fontFamily: 'Quicksand_700Bold',
},
dietType: {
  fontSize: 18,
  color: '#2E4A32',
  fontFamily: 'Quicksand_700Bold',
},
dietValue: {
  fontFamily: 'Quicksand_600SemiBold',
  color: '#000', 
},
caloriesRecipe: {
  fontSize: 16,
  color: '#000',
  fontFamily: 'Quicksand_600SemiBold',
},
proteinRecipe: {
  fontSize: 16,
  color: '#000',
  fontFamily: 'Quicksand_600SemiBold',
},
carbsRecipe: {
  fontSize: 16,
  color: '#000',
  fontFamily: 'Quicksand_600SemiBold',
},
fiberRecipe: {
  fontSize: 16,
  color: '#000',
  fontFamily: 'Quicksand_600SemiBold',
},
ingredientsTitle: {
  fontSize: 18,
  fontFamily: 'Quicksand_700Bold',
  marginBottom: 5,
  color: '#2E4A32',
},
ingredient: {
  fontSize: 16,
  color: '#000',
  marginLeft: 20,
},
instructionsTitle: {
  fontSize: 18,
  fontFamily: 'Quicksand_700Bold',
  marginTop: 15,
  color: '#2E4A32',
},
instructions: {
  fontSize: 16,
  color: '#000',
  marginLeft: 20,
  marginTop: 5,
},
loader: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#FCCF94',
},
//nutritionistForm 
filePreviewContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 8,
  paddingHorizontal: 10,
  backgroundColor: '#f0f9f0', // Lighter green background for success
  borderRadius: 6,
  borderWidth: 1,
  borderColor: '#c0e0c0',
  marginTop: 5, // Space below upload button
  marginBottom: 10, // Space before next element
},
fileNameText: {
  flex: 1, // Take up available space
  fontSize: 14,
  color: '#333',
  marginLeft: 5,
  marginRight: 5,
},
profileImagePreview: {
  width: 40,
  height: 40,
  borderRadius: 20, // Circular preview
  marginRight: 10,
  borderWidth: 1,
  borderColor: '#ccc',
},
removeFileButton: {
  padding: 5, // Increase tap area
},



    cardRating: { // Container for stars and rating text
        flexDirection: 'row',
        alignItems: 'center', // Vertically align stars and text
        marginTop: 4,
    },
    starColor: '#FFA000', // << YOUR STAR COLOR FROM PALETTE
    ratingText:  { // For text like "(4.5 / 10 ratings)"
        marginLeft: 6,
        fontSize: 12,
        fontFamily: 'Quicksand_500Medium', // Ensure font is loaded
        color: '#555555',
    }


});
export default styles;