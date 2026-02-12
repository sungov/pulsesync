import { db } from "./db";
import { users } from "../shared/models/auth";
import { feedback, managerReviews, actionItems } from "../shared/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

const PASSWORD_HASH = "$2b$10$Hs05oY46MByeaafoB27uWO3a9Gce0.6VdvqYlta82vlhwOZM19nwa";

const DEPARTMENTS = ["DEA", "EMPC", "XTI"];

const EXISTING_PROJECTS = ["DataPipeline", "InsightHub", "TeamSync", "WorkflowX", "UnifyAPI", "NexusBridge"];
const NEW_PROJECTS = ["CloudForge", "SmartLens"];
const ALL_PROJECTS = [...EXISTING_PROJECTS, ...NEW_PROJECTS];

const EXISTING_MANAGERS: Record<string, string[]> = {
  DEA: ["mgr.dea1@tsworks.io", "mgr.dea2@tsworks.io"],
  EMPC: ["mgr.empc1@tsworks.io", "mgr.empc2@tsworks.io"],
  XTI: ["mgr.xti1@tsworks.io", "mgr.xti2@tsworks.io"],
};

const NEW_MANAGERS = [
  { email: "mgr.dea3@tsworks.io", firstName: "Tanvi", lastName: "Kulkarni", dept: "DEA", project: "CloudForge" },
  { email: "mgr.empc3@tsworks.io", firstName: "Ravi", lastName: "Srinivasan", dept: "EMPC", project: "SmartLens" },
];

const ALL_MANAGERS: Record<string, string[]> = {
  DEA: [...EXISTING_MANAGERS.DEA, "mgr.dea3@tsworks.io"],
  EMPC: [...EXISTING_MANAGERS.EMPC, "mgr.empc3@tsworks.io"],
  XTI: [...EXISTING_MANAGERS.XTI],
};

const FIRST_NAMES = [
  "Aarav", "Aditi", "Akash", "Amara", "Amit", "Ananya", "Anu", "Arjun", "Deepa", "Dev",
  "Dhruv", "Divya", "Fatima", "Gaurav", "Geeta", "Hari", "Ishaan", "Jaya", "Karan", "Kiara",
  "Lakshmi", "Manish", "Meera", "Mohan", "Nandini", "Nikhil", "Pallavi", "Pooja", "Pranav", "Priti",
  "Raj", "Rakesh", "Reena", "Ritu", "Rohit", "Sachin", "Sandeep", "Sarita", "Shreya", "Siddharth",
  "Suresh", "Swati", "Tarun", "Uma", "Varun", "Veena", "Vijay", "Yash", "Zara", "Aditya",
  "Bhavna", "Chirag", "Disha", "Eshan", "Farhan", "Gauri", "Harsh", "Isha", "Jasmin", "Kunal",
  "Lata", "Madhav", "Namita", "Om", "Pankaj", "Rita", "Sagar", "Tara", "Uday", "Vani",
  "Aman", "Bina", "Chetan", "Devi", "Ekta"
];
const LAST_NAMES = [
  "Agarwal", "Basu", "Bhatt", "Chakraborty", "Chopra", "Das", "Deshpande", "Dutta", "Ghosh", "Goyal",
  "Hegde", "Jha", "Joshi", "Kaur", "Khanna", "Kumar", "Malhotra", "Mishra", "Mukherjee", "Nair",
  "Pandey", "Pillai", "Prasad", "Rao", "Reddy", "Roy", "Saxena", "Sen", "Shah", "Singh",
  "Soni", "Srivastava", "Thakur", "Tripathi", "Varma", "Verma", "Yadav", "Banerjee", "Choudhary", "Dubey",
  "Gupta", "Iyer", "Khatri", "Menon", "Naidu", "Patil", "Rajan", "Sethi", "Tiwari", "Upadhyay",
  "Ahuja", "Bhatia", "Chawla", "Dhar", "Gandhi", "Kapil", "Lal", "Mahajan", "Narayan", "Oberoi",
  "Puri", "Ramesh", "Sahni", "Talwar", "Vyas", "Walia", "Zaveri", "Arora", "Bajaj", "Dhawan",
  "Gill", "Hora", "Jolly", "Kohli", "Luthra"
];

const MOODS = ["Great", "Good", "Neutral", "Challenged", "Burned Out"];
const ACCOMPLISHMENT_TEMPLATES = [
  "Completed the quarterly sprint deliverables ahead of schedule with high quality output.",
  "Successfully led the code review initiative and improved team coding standards.",
  "Delivered key feature integration that unblocked three dependent teams.",
  "Mentored two junior developers and helped them ramp up on the codebase.",
  "Resolved critical production issue within 2 hours, minimizing customer impact.",
  "Designed and implemented the new microservice architecture for user analytics.",
  "Automated CI/CD pipeline reducing deployment time by 40%.",
  "Completed comprehensive documentation for the API endpoints.",
  "Led cross-team collaboration effort for the platform migration.",
  "Optimized database queries resulting in 60% performance improvement.",
  "Shipped the mobile responsive redesign on time with positive user feedback.",
  "Built monitoring dashboards that improved incident response time.",
];
const DISAPPOINTMENT_TEMPLATES = [
  "Delayed delivery on the data migration task due to unforeseen schema complexities.",
  "Could not complete all planned features for the sprint due to changing requirements.",
  "Struggled with the legacy codebase which slowed down progress significantly.",
  "Had to deprioritize learning goals due to urgent production support needs.",
  "Communication gaps with the design team led to rework on UI components.",
  "Testing coverage fell short of targets due to time constraints.",
  "Missed the opportunity to present at the internal tech talk.",
  "Feature rollout had to be delayed due to dependency on another team.",
  "Did not get enough feedback on my design proposals from stakeholders.",
  "Spent too much time on debugging rather than building new features.",
];
const BLOCKER_TEMPLATES = [
  "Waiting for API access from the third-party vendor for over two weeks.",
  "Unclear requirements from product team causing rework cycles.",
  "Infrastructure limitations preventing proper load testing.",
  "Need access to production logs for debugging customer-reported issues.",
  "Cross-team dependency on the authentication service is blocking progress.",
  "Outdated documentation making it hard to integrate with legacy systems.",
  "Limited compute resources in staging environment causing slow test cycles.",
  "No blockers this period - all dependencies were resolved promptly.",
  "Approval process for new tools is taking longer than expected.",
  "Need dedicated time for tech debt reduction that keeps getting deprioritized.",
];
const MENTORING_TEMPLATES = [
  "Strong mentoring culture, senior team members are approachable and helpful.",
  "Would benefit from more structured pair programming sessions.",
  "Mentoring has improved this quarter with the buddy system implementation.",
  "The team knowledge sharing sessions have been really valuable.",
  "Could use more cross-functional mentoring opportunities.",
  "Regular 1-on-1s with my manager have been very helpful for growth.",
  "The team's open door policy makes it easy to seek guidance.",
  "Mentoring culture is good but could be more formalized.",
];
const SUPPORT_TEMPLATES = [
  "Would appreciate more clarity on career growth pathways within the team.",
  "Need additional training on cloud infrastructure and DevOps practices.",
  "More regular feedback from leadership on strategic direction.",
  "Additional support for work-from-home setup would be helpful.",
  "Would like opportunities to attend external conferences and workshops.",
  "Better tooling support for development workflow optimization.",
  "More recognition for contributions beyond regular sprint work.",
  "Support for professional certifications would be motivating.",
];
const GOAL_TEMPLATES = [
  "On track with quarterly goals, completed 3 out of 4 planned objectives.",
  "Exceeded goals this period with early delivery of two major features.",
  "Slightly behind on goals due to unplanned production support work.",
  "Making steady progress on learning objectives alongside sprint work.",
  "Goal progress is good, aiming to complete remaining items next month.",
  "Ahead of schedule on most goals, considering stretching targets.",
  "Good momentum on technical goals, professional development needs more focus.",
  "All goals on track, expecting to complete them by end of quarter.",
];
const PROCESS_SUGGESTION_TEMPLATES = [
  "Consider implementing async standups to save meeting time.",
  "Sprint planning could be more efficient with pre-grooming sessions.",
  "Would suggest adding retrospective action item tracking to improve follow-through.",
  "Current review process works well, no suggestions at this time.",
  "A dedicated tech debt sprint every quarter would help long-term code quality.",
  "Better integration between project management and code review tools.",
  "Standardizing the PR template would improve review quality.",
  "More flexible working hours during non-critical sprint phases.",
];
const PTO_TEMPLATES = [
  "PTO coverage is well managed, team handles absences smoothly.",
  "Sometimes coverage gaps when multiple team members are on leave.",
  "The backup system works well for planned PTO.",
  "Could improve documentation of ongoing work to make handoffs smoother.",
  "PTO policy is fair and the team is supportive of taking time off.",
  "Coverage during holidays could be better planned in advance.",
];

const MGR_COMMENTS = [
  "Good progress. Keep up the consistent delivery.",
  "Noted. Let's discuss strategies to address this in our next 1-on-1.",
  "Excellent work on this front. Your contributions are valued.",
  "I understand the challenges. We'll work on removing these blockers.",
  "Great initiative shown here. I'd like to see more of this.",
  "This is a valid concern. I'll escalate it appropriately.",
  "Solid improvement from last period. The growth is visible.",
  "Let's set up specific metrics to track progress on this.",
  "I appreciate the honest feedback. We'll work on improvements.",
  "Well done. This aligns well with our team objectives.",
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function generatePeriods(): string[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const periods: string[] = [];
  for (let m = 2; m <= 11; m++) {
    periods.push(`${months[m]}-2025`);
  }
  periods.push("Jan-2026");
  periods.push("Feb-2026");
  return periods;
}

function generateFeedbackData(period: string) {
  const moodIdx = randInt(0, 4);
  const mood = MOODS[moodIdx];
  const baseSat = mood === "Great" ? randInt(8, 10) : mood === "Good" ? randInt(6, 8) : mood === "Neutral" ? randInt(5, 7) : mood === "Challenged" ? randInt(3, 5) : randInt(1, 3);
  const sentiment = mood === "Great" ? randFloat(7.5, 9.5) : mood === "Good" ? randFloat(5.5, 7.5) : mood === "Neutral" ? randFloat(4.5, 6.5) : mood === "Challenged" ? randFloat(2.5, 4.5) : randFloat(1.0, 3.0);
  
  return {
    satScore: baseSat,
    moodScore: mood,
    workloadLevel: randInt(1, 5),
    workLifeBalance: randInt(1, 5),
    accomplishments: rand(ACCOMPLISHMENT_TEMPLATES),
    disappointments: rand(DISAPPOINTMENT_TEMPLATES),
    blockers: rand(BLOCKER_TEMPLATES),
    mentoringCulture: rand(MENTORING_TEMPLATES),
    supportNeeds: rand(SUPPORT_TEMPLATES),
    goalProgress: rand(GOAL_TEMPLATES),
    processSuggestions: rand(PROCESS_SUGGESTION_TEMPLATES),
    ptoCoverage: rand(PTO_TEMPLATES),
    aiSentiment: sentiment,
    aiSummary: `Employee shows ${mood.toLowerCase()} sentiment this period. Satisfaction score: ${baseSat}/10. ${sentiment > 6 ? "Overall positive outlook with good engagement." : sentiment > 4 ? "Moderate engagement with some areas needing attention." : "Concerns flagged - recommend manager follow-up."}`,
    aiSuggestedActionItems: sentiment < 5 ? "Schedule check-in to discuss workload and support needs" : "Continue current trajectory and recognize contributions",
    submissionPeriod: period,
  };
}

function generateManagerReview() {
  return {
    mgrSatComment: rand(MGR_COMMENTS),
    mgrMoodComment: rand(MGR_COMMENTS),
    mgrAccComment: rand(MGR_COMMENTS),
    mgrDisComment: rand(MGR_COMMENTS),
    mgrBlockersComment: rand(MGR_COMMENTS),
    mgrSupportComment: rand(MGR_COMMENTS),
    mgrWlbComment: rand(MGR_COMMENTS),
    mgrWorkloadComment: rand(MGR_COMMENTS),
    mgrMentoringComment: rand(MGR_COMMENTS),
    mgrSuggestionsComment: rand(MGR_COMMENTS),
    mgrPtoComment: rand(MGR_COMMENTS),
    mgrGoalComment: rand(MGR_COMMENTS),
  };
}

async function seed() {
  console.log("Starting seed...");

  const periods = generatePeriods();
  const currentPeriod = "Feb-2026";

  const newManagerUsers = NEW_MANAGERS.map((m) => ({
    email: m.email,
    firstName: m.firstName,
    lastName: m.lastName,
    password: PASSWORD_HASH,
    role: "MANAGER" as const,
    deptCode: m.dept,
    projectCode: m.project,
    managerEmail: "sr.mgmt@tsworks.io",
    isApproved: true,
    isAdmin: false,
  }));

  console.log(`Inserting ${newManagerUsers.length} new managers...`);
  for (const mgr of newManagerUsers) {
    await db.insert(users).values(mgr).onConflictDoNothing();
  }

  const existingEmployeeEmails = new Set<string>();
  const existingRows = await db.execute(sql`SELECT email FROM users WHERE role = 'EMPLOYEE'`);
  for (const row of existingRows.rows) {
    existingEmployeeEmails.add(row.email as string);
  }

  const projectsByDept: Record<string, string[]> = {
    DEA: ["DataPipeline", "InsightHub", "CloudForge"],
    EMPC: ["TeamSync", "WorkflowX", "SmartLens"],
    XTI: ["UnifyAPI", "NexusBridge"],
  };

  const targetNewEmployees = 100 - 18 - 6 - 2;
  const newEmployees: any[] = [];
  let empCounter = 7;
  const usedNames = new Set<string>();

  for (let i = 0; i < targetNewEmployees; i++) {
    const dept = DEPARTMENTS[i % 3];
    const managers = ALL_MANAGERS[dept];
    const mgr = managers[i % managers.length];
    const projects = projectsByDept[dept];
    const project = projects[i % projects.length];

    let firstName: string, lastName: string, nameKey: string;
    do {
      firstName = rand(FIRST_NAMES);
      lastName = rand(LAST_NAMES);
      nameKey = `${firstName}-${lastName}`;
    } while (usedNames.has(nameKey));
    usedNames.add(nameKey);

    const email = `emp${empCounter}.${dept.toLowerCase()}@tsworks.io`;
    empCounter++;

    if (!existingEmployeeEmails.has(email)) {
      newEmployees.push({
        email,
        firstName,
        lastName,
        password: PASSWORD_HASH,
        role: "EMPLOYEE",
        deptCode: dept,
        projectCode: project,
        managerEmail: mgr,
        isApproved: true,
        isAdmin: false,
      });
    }
  }

  console.log(`Inserting ${newEmployees.length} new employees...`);
  const BATCH_SIZE = 20;
  for (let i = 0; i < newEmployees.length; i += BATCH_SIZE) {
    const batch = newEmployees.slice(i, i + BATCH_SIZE);
    await db.insert(users).values(batch).onConflictDoNothing();
  }

  const allUsers = await db.execute(sql`SELECT id, email, role, manager_email, dept_code FROM users WHERE role IN ('EMPLOYEE', 'MANAGER') AND is_admin = false`);
  
  const existingFeedbackRows = await db.execute(sql`SELECT user_id, submission_period FROM feedback`);
  const existingFeedbackSet = new Set<string>();
  for (const row of existingFeedbackRows.rows) {
    existingFeedbackSet.add(`${row.user_id}:${row.submission_period}`);
  }

  console.log(`Processing feedback for ${allUsers.rows.length} users across ${periods.length} periods...`);

  let feedbackInserted = 0;
  let reviewsInserted = 0;

  for (const user of allUsers.rows) {
    const userId = user.id as string;
    const userEmail = user.email as string;
    const userRole = user.role as string;
    const managerEmail = user.manager_email as string;

    for (const period of periods) {
      const key = `${userId}:${period}`;
      if (existingFeedbackSet.has(key)) continue;

      const fbData = generateFeedbackData(period);
      const createdDate = periodToDate(period);

      const [inserted] = await db.insert(feedback).values({
        userId,
        ...fbData,
        createdAt: createdDate,
      }).returning({ id: feedback.id });

      feedbackInserted++;

      if (period !== currentPeriod && managerEmail) {
        const reviewerEmail = userRole === "MANAGER" ? "sr.mgmt@tsworks.io" : managerEmail;
        await db.insert(managerReviews).values({
          feedbackId: inserted.id,
          mgrEmail: reviewerEmail,
          ...generateManagerReview(),
          lastEdited: new Date(createdDate.getTime() + 5 * 24 * 60 * 60 * 1000),
        });
        reviewsInserted++;
      }
    }
  }

  console.log(`Inserted ${feedbackInserted} feedback entries and ${reviewsInserted} manager reviews.`);

  const allManagerEmails = [...EXISTING_MANAGERS.DEA, ...EXISTING_MANAGERS.EMPC, ...EXISTING_MANAGERS.XTI, ...NEW_MANAGERS.map(m => m.email)];
  
  const employeesForActionItems = await db.execute(sql`SELECT email, manager_email FROM users WHERE role = 'EMPLOYEE' AND is_admin = false AND manager_email IS NOT NULL`);
  
  const existingActionItems = await db.execute(sql`SELECT emp_email FROM action_items`);
  const existingActionSet = new Set<string>();
  for (const row of existingActionItems.rows) {
    existingActionSet.add(row.emp_email as string);
  }
  
  let actionItemsInserted = 0;
  const ACTION_TASKS = [
    "Complete training module on new framework",
    "Update documentation for assigned component",
    "Review and refactor legacy code section",
    "Prepare presentation for team knowledge sharing",
    "Set up automated tests for critical user flows",
    "Shadow senior developer on architecture review",
    "Complete security awareness certification",
    "Write unit tests for recent feature additions",
    "Create onboarding guide for new team members",
    "Optimize API response times for key endpoints",
  ];

  for (const emp of employeesForActionItems.rows) {
    const empEmail = emp.email as string;
    if (existingActionSet.has(empEmail)) continue;
    
    if (Math.random() < 0.4) {
      const numItems = randInt(1, 3);
      for (let i = 0; i < numItems; i++) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + randInt(-10, 30));
        const status = dueDate < new Date() ? (Math.random() < 0.5 ? "Completed" : "Pending") : "Pending";
        
        await db.insert(actionItems).values({
          empEmail,
          mgrEmail: emp.manager_email as string,
          assignedTo: Math.random() < 0.7 ? "EMPLOYEE" : "MANAGER",
          task: rand(ACTION_TASKS),
          dueDate,
          status,
        });
        actionItemsInserted++;
      }
    }
  }

  console.log(`Inserted ${actionItemsInserted} action items.`);

  const finalCount = await db.execute(sql`SELECT COUNT(*) as total FROM users WHERE role IN ('EMPLOYEE', 'MANAGER', 'SENIOR_MGMT')`);
  const feedbackCount = await db.execute(sql`SELECT COUNT(*) as total FROM feedback`);
  const reviewCount = await db.execute(sql`SELECT COUNT(*) as total FROM manager_reviews`);
  
  console.log(`\nFinal counts:`);
  console.log(`  Users: ${finalCount.rows[0].total}`);
  console.log(`  Feedback entries: ${feedbackCount.rows[0].total}`);
  console.log(`  Manager reviews: ${reviewCount.rows[0].total}`);
  console.log("Seed completed!");
}

function periodToDate(period: string): Date {
  const parts = period.split("-");
  if (parts.length !== 2) return new Date();
  const [monthStr, yearStr] = parts;
  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const month = monthMap[monthStr];
  const year = parseInt(yearStr);
  if (month === undefined || isNaN(year)) return new Date();
  const d = new Date(year, month, randInt(1, 25), randInt(9, 17), randInt(0, 59));
  if (isNaN(d.getTime())) return new Date();
  return d;
}

seed().catch(console.error).finally(() => process.exit(0));
