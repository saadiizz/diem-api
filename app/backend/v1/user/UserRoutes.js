var express = require('express');
var UserController = require('./UserController');
var jwt = require('jwt-simple');
var firebase = require('./../routes.js');
var auth = require('../authentication/AuthenticationController');
var Multer = require('multer');
var UploadController = require('./../upload/UploadController');
const { isAdmin } = require('../middlewares/isAdmin.middleware');

/**
 * Router object
 */
const router = express.Router();
const users = new UserController();
const upload = new UploadController();
var multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // no larger than 5mb, you can change as needed.
  }
});

/**
 * Retrive the user
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */
router.get('/me', auth.isAuthenticated, (req, res) => {
  console.log(req.user_identification.uid);
  users.getUser(req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

/**
 * Retrive the user
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */
router.get('/getPublicProfile', auth.isAuthenticated, (req, res) => {
  console.log(req.user_identification.uid);
  users.getPublicProfile(req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.post('/update_payment_method', auth.isAuthenticated, (req, res) => {

  const body = req.body
  const uid = req.user_identification.uid

  users.update_payment_method(body, uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.post('/update_wepay_account', auth.isAuthenticated, (req, res) => {

  const body = req.body
  const uid = req.user_identification.uid

  users.update_wepay_account(body, uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.post('/location', auth.isAuthenticated, (req, res) => {
  console.log('This is the req: ' + JSON.stringify(req.headers));
  const body = req.body
  const params = req.originalUrl

  users.saveUserLocaton(body, params, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.get('/myproject/open', auth.isAuthenticated, (req, res) => {
  users.openProjects(req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.get('/myproject/completed', auth.isAuthenticated, (req, res) => {
  users.completedProjects(req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.get('/myproject/assigned', auth.isAuthenticated, (req, res) => {
  users.assignedProjects(req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.get('/myproject/otherListings', auth.isAuthenticated, (req, res) => {
  users.disputedProjects(req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.get('/myproject/unfulfilled', auth.isAuthenticated, (req, res) => {
  users.unfulfilledProjects(req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.get('/myJobberproject/open', auth.isAuthenticated, (req, res) => {
  users.openJobberProjects(req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.get('/myJobberproject/completed', auth.isAuthenticated, (req, res) => {
  users.completedJobberProjects(req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.get('/myJobberproject/assigned', auth.isAuthenticated, (req, res) => {
  users.assignedJobberProjects(req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.get('/myJobberproject/otherListings', auth.isAuthenticated, (req, res) => {
  users.disputedJobberProjects(req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.get('/myJobberproject/unfulfilled', auth.isAuthenticated, (req, res) => {
  users.unfulfilledJobberProjects(req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.get('/myJobberproject/myCalendar', auth.isAuthenticated, (req, res) => {
  users.myCalendarJobberProjects(req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.get('/admin/getDiemjobber', auth.isAuthenticated, (req, res) => {
  users.getDiemJobberForAdmin(req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj);
  })
});

router.post('/jobber/editProfile', auth.isAuthenticated, multer.fields([{
    name: 'profile_picture',
    maxCount: 1
  },
  {
    name: 'work_pictures',
    maxCount: 8
  }
]), (req, res) => {
  const body = req.body
  let file = req.files;
  if(file && file.profile_picture !== undefined && file.work_pictures !== undefined) {
    upload.uploadImageToStorage(file.profile_picture, req.user_identification.uid, '/profile').then((profle_image) => {
        body.profile_picture = profle_image;
        upload.uploadImageToStorageProfileWork(file.work_pictures, req.user_identification.uid, '/user/work_pictures').then((work_image) => {
          body.work_pictures = work_image;
          users.editUserProfile(body, req.user_identification.uid, true, (status, obj) => {
            res.status(status).json(obj)
          });
        }).catch((error) => {
        res.status(400).send({
          status: 'error: work project picture could not be uploaded ' + error
        });
      });
    }).catch((error) => {
      res.status(400).send({
        status: 'error: profile picture could not be uploaded ' + error
      });
    });
  }
  else {
    if(file && file.profile_picture !== undefined && file.work_pictures === undefined) {
      upload.uploadImageToStorage(file.profile_picture, req.user_identification.uid, '/profile').then((profle_image) => {
        body.profile_picture = profle_image;
        users.editUserProfile(body, req.user_identification.uid, true, (status, obj) => {
          res.status(status).json(obj)
        });
      }).catch((error) => {
        res.status(400).send({
        status: 'error: profile picture could not be uploaded ' + error
      });
    });
    }
    else if(file && file.profile_picture === undefined && file.work_pictures !== undefined) {
      upload.uploadImageToStorageProfileWork(file.work_pictures, req.user_identification.uid, '/user/work_pictures').then((work_image) => {
        body.work_pictures = work_image;
        users.editUserProfile(body, req.user_identification.uid, true, (status, obj) => {
          res.status(status).json(obj)
        });
      }).catch((error) => {
        res.status(400).send({
        status: 'error: work project picture could not be uploaded ' + error
      });
    });
    }
    else {
      users.editUserProfile(body, req.user_identification.uid, true, (status, obj) => {
        res.status(status).json(obj)
      });
    }
  }
});

router.post('/requestor/editProfile', auth.isAuthenticated, (req, res) => {
  const body = req.body
  users.unfulfilledJobberProjects(req.user_identification.uid, false, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.post('/requestor/location', (req, res) => {
  const body = req.body
  users.saveLocation(body, 'requestor', (status, obj) => {
    res.status(status).json(obj)
  });
});

router.post('/jobber/location', (req, res) => {
  const body = req.body
  users.saveLocation(body, 'jobber', (status, obj) => {
    res.status(status).json(obj)
  });
});

router.post('/reviews',auth.isAuthenticated, (req, res) => {
  const body = req.body
  users.saveUserReviews(body,req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.post('/user_report',auth.isAuthenticated, (req, res) => {
  const body = req.body
  users.reportUser(body,req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.get('/credit_card', auth.isAuthenticated, (req, res) => {
  users.getCredicardInfo(req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.delete('/credit_card', auth.isAuthenticated, (req, res) => {
  const body = req.body
  const uid = req.user_identification.uid
  users.deleteCredicardInfo(body, uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.post('/install_info', (req, res) => {
  console.log("Install Information");
  const body = req.body;

  if(body && body.device_token) { 
    users.devicePushtoken(body, (status, obj) => {
      res.status(status).json(obj)
    });
  } else {
    console.log("Device Token information is missing!")
    res.status(400).json({error_message: "Device Token information is missing!"})
  }
});

router.post('/jobstatus_update', (req, res) => {
  users.updateJobStatus((status, obj) => {
    res.status(status).json(obj)
  });
});

router.post('/project', auth.isAuthenticated, (req, res) => {
  let body = req.body;
  users.userProjects(body, req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.post('/listing_location', (req, res) => {
  const body = req.body
  users.deleteJoblocation(body, (status, obj) => {
    res.status(status).json(obj)
  });
});

router.post('/project/details', auth.isAuthenticated, (req, res) => {
  let body = req.body;
  users.projectDetails(body, req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
}); 

router.post('/clear_accepted_dod_listing', auth.isAuthenticated, (req, res) => {
  users.clearAcceptedDodListing(req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj)
  });
}); 

router.post('/doorknocker_info', (req, res) => {
  console.log("doorknocker Information");
  const body = req.body;
  users.saveDoorknockerCode(body, (status, obj) => {
    res.status(status).json(obj)
  });
});
  
router.get('/app_version', (req, res) => {
  users.getAppVersion((status, obj) => {
    res.status(status).json(obj)
  });
});

router.post('/book_free_quote', auth.isAuthenticated, (req, res) => {
  const body = req.body;
  users.requestorBookFreeQuote(body, req.user_identification.uid, (status, obj) => {
    res.status(status).json(obj);
  })
});

router.post('/createSubJobber', auth.isAuthenticated, (req, res) => {
  const body = req.body;
  users.createSubJobber(body, (status, obj) => {
    res.status(status).json(obj);
  })
});

router.post('/updateSubJobber', auth.isAuthenticated, (req, res) => {
  const body = req.body;
  users.updateSubJobber(body, (status, obj) => {
    res.status(status).json(obj);
  })
});

router.get('/getStatesProvinceData', (req, res) => {
  users.getStatesProvinceData((status, obj) => {
    res.status(status).json(obj);
  })
});

router.post('/updateFilterDataUser',auth.isAuthenticated, (req, res) => {
  users.updateFilterDataUser(req.user_identification.uid, req.body,(status, obj) => {
    res.status(status).json(obj);
  })
});
router.post('/deleteUser', auth.isAuthenticated, (req, res) => {
  // body will contain reason for deletion. UID is req.user_identification.uid
  users.deleteUser(req.user_identification.uid, req.body, (status, obj) => {
    res.status(status).json(obj);
  });
})

router.get('/:userId/projects/assigned', auth.isAuthenticated, (req, res) => {
  let { userId } = req.params;
  users.getUserProjects_admin(
    req.user_identification.uid,
    userId,
    "projects/jobber/assigned",
    (status, obj) => {
      res.status(status).json(obj);
    }
  );
});


router.patch("/:userId", auth.isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { allowedAcceptJobCount } = req.body;

    await users.updateUser(userId, {
      allowedAcceptJobCount: Number(allowedAcceptJobCount),
    });

    res.status(200).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
