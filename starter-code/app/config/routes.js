var express          = require('express'),
router               = express.Router(),
bodyParser           = require('body-parser');

var agentsController = require('../controllers/agentsController');

router.route('/agents')
  .get(agentsController.getAll)
  .post(agentsController.createAgent);

router.route('/agents/:id')
  .get(agentsController.getAgent)
  .patch(agentsController.updateAgent)
  .put(agentsController.updateAgent)
  .delete(agentsController.removeAgent);

module.exports       = router;