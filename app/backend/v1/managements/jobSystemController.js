// var firebase = require("firebase");
var admin = require("firebase-admin");
var User = require("../user/User")
var JOBSystems = require("./jobSystem")
const _ = require("underscore");
var Category = require("../category/Category")

class JOBSController {
	
	getAllMetropolitianCity(callback){
	    JOBSystems.getJOBSmetropolitinaCity(admin, (responseCode, values) => {
	      callback(responseCode, values);
	    });
	}

	getVehicle(callback){
	    JOBSystems.getVehicle(admin, (responseCode, values) => {
	      callback(responseCode, values);
	    });
	}

	getJOBSgender(callback){
	    JOBSystems.getJOBSgender(admin, (responseCode, values) => {
	      callback(responseCode, values);
	    });
	}

	getjobberGrade(callback){
	    JOBSystems.getJOBSjobberGrade(admin, (responseCode, values) => {
	      callback(responseCode, values);
	    });
	}

	getJOBSstatus(callback){
	    JOBSystems.getJOBSstatus(admin, (responseCode, values) => {
	      callback(responseCode, values);
	    });
	}

	getJOBSactiveness(callback){
	    JOBSystems.getJOBSactiveness(admin, (responseCode, values) => {
	      callback(responseCode, values);
	    });
	}

	getJOBSlists(callback){
	    JOBSystems.getFromFirebase(admin, (responseCode, promises, obj) => {
	      if (responseCode === '200') {
	      	let returnObj = {}
	        Promise.all(promises).then(values => {
	          for (var item in obj) {
	            var sub_categoriesArray = new Array();
	            for (var subItem of Object.keys(obj[item].value.sub_categories)) {
	              var subobj = _.filter(values, function(x){ return (x.id == subItem && x.isActive == true)});
	              if(subobj[0] != null) {
	                sub_categoriesArray.push(subobj[0]); 
	              }
	            }
	            console.log('hhhhhh')
	            // obj[item].name = obj[item].value.name
	            if(obj[item].value.name == "Home"){
	            	console.log('home')
	            	obj[item].name = "On Demand"
	            }
	            if(obj[item].value.name == "Custom"){
	            	console.log('Custom')
	            	obj[item].name = "Custom"
	            }
	            if(obj[item].value.name == "Business"){
	            	console.log('Bussiness')
	            	obj[item].name = "Smart Home"
	            }
	            // obj[item].sub_categories = sub_categoriesArray;
	            returnObj[obj[item].name] = sub_categoriesArray
	            delete obj[item].value
	          }
	          callback('200', returnObj);
	        }).catch(function(err) {
	          // log that I have an error, return the entire array;
	          console.log('A promise failed to resolve', err);
	          callback(404, err);
	        });
	      } else {
	      	console.log('in elssss')
	        callback(responseCode, promises);
	      }
	    });
	}

	getJOBStestTerms(callback){
	    JOBSystems.getJOBStestTerms(admin, (responseCode, values) => {
	      callback(responseCode, values);
	    });
	}
	
	getJOBSreliability(callback){
	    JOBSystems.getJOBSreliability(admin, (responseCode, values) => {
	      callback(responseCode, values);
	    });
	}
	
    saveTypeOfWork(body, callback){
    	JOBSystems.saveTypeOfWork(admin, body , (responseCode, values)=>{
    		callback(responseCode, values);
    	})
    }


	saveJOBSprofile(body, file, callback){
		JOBSystems.saveJOBSprofile(admin, body, file, (responseCode, values)=>{
			callback(responseCode, values);
		})
	}

	editJOBSuserProfile(body, file, callback){
		let userId =  body.userId;
		JOBSystems.editJOBSuserProfile(body, userId, admin, (responseCode, responseMessage) => {
        callback(responseCode, responseMessage);
      });
	}

	getAllJOBSprofileData(body, callback){
		let city = body.filterValue ? body.filterValue.metropolitanCity :undefined;
		let typeOfWork =  body.filterValue ? body.filterValue.typeOfWork :undefined;
		let filterValue = body.filterValue
		JOBSystems.getAllJOBSprofileData(admin, body, (responseCode, values)=>{
			if(values && city){
				values = values.filter(v => v !== null && v.metropolitanCity == city);
			}
			if(values && typeOfWork){
				values = _.filter(values, function(v){
					return _.findWhere(v.typeOfWork, typeOfWork)});
			}
			callback(responseCode, values);
		})
	}

	getJOBSuserById(data, callback){
		JOBSystems.getJOBSuserById(data, admin, (responseCode, values)=>{
			callback(responseCode, values);
		})
	}

  addInternalNotesJOBS(body, callback){
    console.log('innnn',body)
      JOBSystems.addInternalNotesJOBS(body, admin, (responseCode, responseMessage) => {
       callback(responseCode, responseMessage);
      })
 	}

  editInternalNotesJOBS(body, callback){
      JOBSystems.editInternalNotesJOBS(body, admin , (responseCode, responseMessage)=>{
        callback(responseCode, responseMessage)
      })
   } 

  removeInternalNotesJOBS(body, callback){
      JOBSystems.removeInternalNotesJOBS(body, admin, (responseCode, responseMessage) => {
      callback(responseCode, responseMessage);
    })
  }

  removeIdImage(body, callback){
      JOBSystems.removeIdImage(body, admin, (responseCode, responseMessage) => {
      callback(responseCode, responseMessage);
    })
  }
}


module.exports = JOBSController