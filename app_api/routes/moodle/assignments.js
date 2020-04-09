const Router = require("express").Router;
const { verifyJwt } = require("../../helpers/verifyToken");
const assignmentService = require("../../services/assignment.service")();
const userService = require("../../services/user.service")();
const moodleService = require("../../services/moodle.service")();
const fs = require("fs");
const pretty = require("pretty");
const pdf = require("html-pdf");
const options = { format: "Letter" };

const router = Router({
  mergeParams: true,
});

/**
 * Get assignments from moodle.
 */
router.get("/get-mdl-assignments", verifyJwt, async (req, res) => {
  let user = await userService.getUserByID(req.decodedToken._id);
  const courseArr = await moodleService.getUsersCoursesIDS(
    user.moodleUserID,
    user.moodleToken
  );
  let assignments = await assignmentService.getUserAssignments(
    user.moodleToken,
    courseArr
  );
  let groupedbycourse = assignments.groupedbycourse;
  let finalAssignments = [];
  // Define our array of assignments
  for (let assignment in groupedbycourse) {
    let pre = groupedbycourse[assignment].events;
    for (let a in pre) {
      finalAssignments.push({
        moodleID: pre[a].id,
        name: pre[a].name.replace(" is due", ""),
        description: pre[a].description,
        url: pre[a].url,
        course: {
          courseMoodleID: pre[a].course.id,
          courseCode: pre[a].course.shortname,
          courseName: pre[a].course.fullname,
        },
        expDate: pre[a].formattedtime.replace(/<[^>]*>/g, ""),
        status: false,
        _user: user,
      });
    }
  }
  // Store newly fetched assignments in the database
  await assignmentService.storeAssignments(finalAssignments);

  return res.status(200).send({
    success: true,
    message: "Assignments fetched from moodle and stored in database",
  });
});

/**
 * Get assignments from the database
 */
router.get("/assignments", verifyJwt, async (req, res) => {
  // Fetch courses (always updated) from the database
  let finalRes = await assignmentService.fetchUserAssignments(
    req.decodedToken._id
  );
  return res.status(200).send(finalRes);
});

/**
 * Store a submission
 */
router.post("/submission/:id", verifyJwt, async (req, res) => {
  //Fetch the user
  let user = await userService.getUserByID(req.decodedToken._id);
  //Create folder (if it does exist) of the user
  if (!fs.existsSync("app_api/files/" + user._id)) {
    fs.mkdirSync("app_api/files/" + user._id);
  }
  //Save submission
  fs.writeFile(
    "app_api/files/" + user._id + "/" + req.body._assignment + ".html",
    pretty(req.body.content),
    (err, data) => {
      if (err) {
        return res.status(500).send({
          success: false,
          message: "Error",
        });
      }
    }
  );
  //Convert to PDF
  let submissionToPDF = fs.readFileSync(
    "app_api/files/" + user._id + "/" + req.body._assignment + ".html",
    "utf8"
  );
  pdf
    .create(submissionToPDF, options)
    .toFile(
      "app_api/files/" + user._id + "/" + req.body._assignment + ".pdf",
      (err, data) => {
        if (err) {
          return res.status(500).send({
            success: false,
            message: "Error",
          });
        }
      }
    );
  return res.status(200).send({
    success: true,
    message: "Reached back",
  });
});
/**
 * Mark an assignment as done
 */
router.put("/assignment/:id", verifyJwt, async (req, res) => {
  await assignmentService.markAsDone(req.params.id);
  return res.status(200).send({
    success: true,
    message: "Assignment has been marked done successfully",
  });
});
module.exports = router;
