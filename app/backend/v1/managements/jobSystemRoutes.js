var express = require('express');
var JOBSController = require('./jobSystemController');
var firebase = require('./../routes.js');
var auth = require('../authentication/AuthenticationController');
var Multer = require('multer');
var CategoryController = require('../category/CategoryController');
var UploadController = require("../upload/UploadController")
const upload = new UploadController();

/**
 * Router object
 */
const router = express.Router();
const jobsystem = new JOBSController();
const category = new CategoryController();

var multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // no larger than 5mb, you can change as needed.
  }
});


/**
 * Retrive all the 
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */

router.get('/getMetropolitianCity', (req, res) => {
  jobsystem.getAllMetropolitianCity((status, obj) => {
    res.status(status).json(obj)
  });

});

router.get('/getVehicle', (req, res) => {
  jobsystem.getVehicle((status, obj) => {
    res.status(status).json(obj)
  });

});

router.get('/getGender', (req, res) => {
  jobsystem.getJOBSgender((status, obj) => {
    res.status(status).json(obj)
  });

});

router.get('/getJobberGrade', (req, res) => {
  jobsystem.getjobberGrade((status, obj) => {
    res.status(status).json(obj)
  });

});

router.get('/getJOBSstatus', (req, res) => {
  jobsystem.getJOBSstatus((status, obj) => {
    res.status(status).json(obj)
  });

});

router.get('/getJOBSactiveness', (req, res) => {
  jobsystem.getJOBSactiveness((status, obj) => {
    res.status(status).json(obj)
  });

});

router.get('/getJOBSlists', (req, res) => {
  jobsystem.getJOBSlists((status, obj) => {
    res.status(status).json(obj)
  });
});

router.get('/getJOBStestTerms', (req, res) => {
  jobsystem.getJOBStestTerms((status, obj) => {
    res.status(status).json(obj)
  });

});

router.get('/getJOBSreliability', (req, res) => {
  jobsystem.getJOBSreliability((status, obj) => {
    res.status(status).json(obj)
  });

});


router.post('/getAllJOBSprofile', (req, res) => {
  jobsystem.getAllJOBSprofileData(req.body, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.post('/getJOBSuserById', (req, res) => {
  jobsystem.getJOBSuserById(req.body, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.post('/saveTypeOfWork', (req, res) => {
  jobsystem.saveTypeOfWork(req.ebody, (status, obj) => {
    res.status(status).json(obj)
  });

});

router.post('/saveJOBSprofile', multer.fields([{
    name: 'profile_picture',
    maxCount: 1
  },
  {
    name: 'id_pictures',
    maxCount: 8
  }
]),(req, res)=>{
  let file =  req.files;
	let body = req.body;
	jobsystem.saveJOBSprofile(body, file, (status, obj)=>{
		res.status(status).json(obj);
	})
})


router.post('/editJOBSProfile', auth.isAuthenticated, multer.fields([{
    name: 'profile_picture',
    maxCount: 1
  },
  {
    name: 'id_pictures',
    maxCount: 8
  }
]), (req, res) => {
  console.log('innnnnnnnnnnn')
  const body = req.body
  let file = req.files;
  if(file && file.profile_picture !== undefined && file.id_pictures !== undefined) {
    upload.uploadImageToStorage(file.profile_picture, body.userId, '/JOBS/profile').then((profle_image) => {
        body.profile_picture = profle_image;
        upload.uploadImageToStorageProfileWork(file.id_pictures, body.userId, '/JOBS/id_pictures').then((id_image) => {
          body.id_pictures = id_image;
          jobsystem.editJOBSuserProfile(body, body.userId, (status, obj) => {
            res.status(status).json(obj)
          });
        }).catch((error) => {
        res.status(400).send({
          status: 'error: Id pictures could not be uploaded ' + error
        });
      });
    }).catch((error) => {
      res.status(400).send({
        status: 'error: profile picture could not be uploaded ' + error
      });
    });
  }
  else {
    if(file && file.profile_picture !== undefined && file.id_pictures === undefined) {
      upload.uploadImageToStorage(file.profile_picture, body.userId, '/JOBS/profile').then((profle_image) => {
        body.profile_picture = profle_image;
        jobsystem.editJOBSuserProfile(body, body.userId, (status, obj) => {
          res.status(status).json(obj)
        });
      }).catch((error) => {
        res.status(400).send({
        status: 'error: profile picture could not be uploaded ' + error
      });
    });
    }
    else if(file && file.profile_picture === undefined && file.id_pictures !== undefined) {
      upload.uploadImageToStorageProfileWork(file.id_pictures, body.userId, '/JOBS/id_pictures').then((id_image) => {
        body.id_pictures = id_image;
        jobsystem.editJOBSuserProfile(body, body.userId, (status, obj) => {
          res.status(status).json(obj)
        });
      }).catch((error) => {
        res.status(400).send({
        status: 'error: id picture could not be uploaded ' + error
      });
    });
    }
    else {
      jobsystem.editJOBSuserProfile(body, body.userId, (status, obj) => {
        res.status(status).json(obj)
      });
    }
  }
});


router.post('/addInternalNotesJOBS', (req, res)=>{
   let body = req.body;
   jobsystem.addInternalNotesJOBS(body, (status, obj)=>{
     res.status(status).json(obj);
   })
})

router.post('/editInternalNotesJOBS', (req, res)=>{
   let body = req.body;
   jobsystem.editInternalNotesJOBS(body, (status, obj)=>{
     res.status(status).json(obj);
   })
})


router.post('/removeInternalNotesJOBS', auth.isAuthenticated, (req, res)=>{
   let body = req.body;
   jobsystem.removeInternalNotesJOBS(body, (status, obj)=>{
     res.status(status).json(obj);
   })
})

router.post('/removeIdImage', (req, res)=>{
   let body = req.body;
   jobsystem.removeIdImage(body, (status, obj)=>{
     res.status(status).json(obj);
   })
})


module.exports = router;
