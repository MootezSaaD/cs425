const Router = require("express").Router;
const { verifyJwt } = require("../../helpers/verifyToken");
const statsService = require("../../services/stats.service")();
const router = Router({
  mergeParams: true,
});

// Return the overall progress of the course submissions, i.e return the number of finished/unfinished assignments
// Implement a a doughnut chart in the front end
router.get("/progress/:courseId", verifyJwt, async (req, res) => {
  let query = await statsService.calcCourseProgress(
    parseInt(req.params.courseId),
    req.decodedToken._id
  );
  return res.status(200).send(query);
});

module.exports = router;
