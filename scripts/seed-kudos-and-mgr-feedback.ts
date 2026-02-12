import pg from "pg";
import { format, subMonths, subDays } from "date-fns";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const VALUE_TAGS = ["Teamwork", "Innovation", "Leadership", "Going the Extra Mile", "Mentorship", "Problem Solving"];

const KUDOS_MESSAGES: Record<string, string[]> = {
  "Teamwork": [
    "Jumped in to help debug a critical production issue even though it wasn't their sprint item. True team player!",
    "Organized an amazing cross-team brainstorming session that unblocked our Q3 roadmap.",
    "Always willing to pair program and share knowledge with newer team members.",
    "Stepped up to cover for a teammate during their leave without being asked. Grateful!",
    "Led the cross-functional sync beautifully and made sure every voice was heard.",
    "Helped onboard three new hires this month and made them feel welcome from day one.",
    "Collaborated with the design team to ship the new dashboard two days early.",
    "Volunteered to take on the integration testing so the rest of the team could focus on features.",
  ],
  "Innovation": [
    "Built an internal CLI tool that cut our deployment time by 40%. Game changer!",
    "Proposed a caching strategy that reduced our API response times from 800ms to under 200ms.",
    "Introduced automated regression testing that caught 3 bugs before they hit production.",
    "Created a Slack bot that automates our daily standup summaries - the team loves it.",
    "Pioneered our new A/B testing framework that's now used across all product teams.",
    "Developed a novel approach to data pipeline optimization that saved us significant cloud costs.",
  ],
  "Leadership": [
    "Took ownership of the incident response and communicated clearly with all stakeholders.",
    "Mentored the junior developers through a complex architectural decision with patience and clarity.",
    "Drove the technical design review and ensured we made a well-informed decision.",
    "Stepped up as interim tech lead and kept the team motivated during a challenging quarter.",
    "Led the post-mortem with empathy and focus on learning rather than blame.",
    "Championed accessibility standards across the product and got buy-in from leadership.",
  ],
  "Going the Extra Mile": [
    "Stayed late to ensure the client demo was flawless. The client was incredibly impressed!",
    "Wrote comprehensive documentation for the new API that other teams are now using as a template.",
    "Proactively identified and fixed a security vulnerability before it became an issue.",
    "Prepared a thorough competitive analysis that informed our product strategy.",
    "Created training materials for the new CI/CD pipeline without being asked.",
    "Fixed a long-standing UX issue that had been frustrating customers for months.",
  ],
  "Mentorship": [
    "Spent hours helping me understand our microservices architecture. Couldn't have done it without them!",
    "Ran a fantastic lunch-and-learn on TypeScript best practices. The whole team leveled up.",
    "Patiently walked me through code review feedback and helped me become a better developer.",
    "Created a mentorship program for junior engineers that's making a real difference.",
    "Always makes time for 1-on-1s and gives thoughtful, actionable career advice.",
    "Shared their experience with system design patterns in a way that made complex concepts accessible.",
  ],
  "Problem Solving": [
    "Debugged a race condition that had been plaguing us for weeks. Brilliant root cause analysis!",
    "Found an elegant solution to our data consistency problem that was both simple and robust.",
    "Quickly identified the bottleneck in our pipeline and implemented a fix within hours.",
    "Solved a tricky cross-browser compatibility issue that had stumped the whole frontend team.",
    "Devised a creative workaround for the third-party API limitation that kept our timeline on track.",
    "Methodically traced a memory leak through our entire stack and fixed it with minimal disruption.",
  ],
};

const MGR_FEEDBACK_TEMPLATES = [
  { text: "Really appreciate the regular 1-on-1s and how they always follow up on action items. Makes me feel heard and supported.", rating: 5 },
  { text: "Great at providing clear direction and context for projects. I always understand the 'why' behind what we're working on.", rating: 5 },
  { text: "Could improve on giving more timely feedback on code reviews. Sometimes PRs sit for days without a response.", rating: 3 },
  { text: "Very supportive of career growth. Helped me identify stretch projects and connected me with senior engineers for mentoring.", rating: 5 },
  { text: "Sometimes micromanages implementation details. Would prefer more trust in how I approach solutions as long as the outcome is right.", rating: 2 },
  { text: "Does a good job shielding the team from organizational noise. We can focus on our work without unnecessary distractions.", rating: 4 },
  { text: "Tends to cancel or reschedule 1-on-1s frequently. It sends a signal that our time together isn't a priority.", rating: 2 },
  { text: "Excellent at recognizing good work publicly in team meetings. It boosts morale and motivates the whole team.", rating: 5 },
  { text: "Would like more constructive feedback. The feedback I get is either very positive or nothing at all - the middle ground would help me grow.", rating: 3 },
  { text: "Handles conflicts within the team well. Fair and balanced approach to resolving disagreements.", rating: 4 },
  { text: "Could be more transparent about team priorities and how decisions are made at the leadership level.", rating: 3 },
  { text: "Very approachable and creates a psychologically safe environment. I feel comfortable raising concerns.", rating: 5 },
  { text: "Struggles with delegating effectively. Takes on too much themselves and then becomes a bottleneck for the team.", rating: 2 },
  { text: "Good technical guidance but could improve on the people management side. Career growth conversations feel surface-level.", rating: 3 },
  { text: "Consistently advocates for the team's needs with upper management. We got better tooling and resources because of their efforts.", rating: 5 },
  { text: "Communication style is sometimes terse in Slack. Hard to read tone and it occasionally creates unnecessary stress.", rating: 2 },
  { text: "Does a great job setting realistic deadlines and pushing back on unreasonable asks from stakeholders.", rating: 4 },
  { text: "Would appreciate more visibility into how my performance is being evaluated. The criteria feel unclear.", rating: 3 },
  { text: "Fantastic at running efficient meetings. Always has an agenda, sticks to time, and follows up with action items.", rating: 5 },
  { text: "Sometimes plays favorites with project assignments. Would appreciate more equitable distribution of interesting work.", rating: 2 },
  { text: "Supportive during personal challenges. Showed genuine empathy when I needed flexibility with my schedule.", rating: 5 },
  { text: "Technical decisions are sometimes made without consulting the team. More collaborative decision-making would be appreciated.", rating: 3 },
  { text: "Solid manager overall. Good balance of autonomy and guidance. Always available when I need help but doesn't hover.", rating: 4 },
  { text: "Provides excellent context during sprint planning. I always understand how my work connects to the bigger picture.", rating: 4 },
  { text: "Needs to improve on follow-through. Action items from our 1-on-1s sometimes get forgotten or deprioritized.", rating: 3 },
  { text: "Very good at identifying team members' strengths and assigning work accordingly. I feel I'm being utilized well.", rating: 4 },
  { text: "Can be dismissive of concerns raised in retrospectives. The same issues keep coming up because they aren't addressed.", rating: 2 },
  { text: "Has helped me grow tremendously this year. I've taken on more responsibility and feel more confident in my role.", rating: 5 },
  { text: "Inconsistent with expectations. What's acceptable one week might not be the next. Clearer standards would help.", rating: 2 },
  { text: "Balances business needs with team wellbeing effectively. Never pushes unsustainable workloads on us.", rating: 4 },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(monthsBack: number): Date {
  const daysBack = Math.floor(Math.random() * (monthsBack * 30));
  return subDays(new Date(), daysBack);
}

async function seed() {
  const client = await pool.connect();
  try {
    const { rows: users } = await client.query(
      `SELECT id, email, first_name, last_name, role, dept_code, manager_email FROM users WHERE role != 'SENIOR_MGMT' ORDER BY random()`
    );
    const employees = users.filter((u: any) => u.role === "EMPLOYEE");
    const managers = users.filter((u: any) => u.role === "MANAGER");
    const allNonAdmin = users.filter((u: any) => !u.email.includes("admin"));

    await client.query("DELETE FROM kudos");
    await client.query("DELETE FROM manager_feedback");

    console.log("Seeding kudos...");
    let kudosCount = 0;
    for (let i = 0; i < 120; i++) {
      const giver = pickRandom(allNonAdmin);
      let receiver = pickRandom(allNonAdmin);
      while (receiver.id === giver.id) {
        receiver = pickRandom(allNonAdmin);
      }
      const tag = pickRandom(VALUE_TAGS);
      const msgs = KUDOS_MESSAGES[tag];
      const msg = pickRandom(msgs);
      const isAnon = Math.random() < 0.15;
      const createdAt = randomDate(12);

      await client.query(
        `INSERT INTO kudos (giver_user_id, receiver_user_id, message, value_tag, is_anonymous, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [giver.id, receiver.id, msg, tag, isAnon, createdAt]
      );
      kudosCount++;
    }
    console.log(`  Inserted ${kudosCount} kudos entries.`);

    console.log("Seeding anonymous manager feedback...");
    const managerEmails = managers.map((m: any) => m.email);
    let mgrFbCount = 0;

    for (let monthsBack = 0; monthsBack < 12; monthsBack++) {
      const period = format(subMonths(new Date(), monthsBack), "MMM-yyyy");
      const numFeedback = 4 + Math.floor(Math.random() * 4);
      const shuffled = [...employees].sort(() => Math.random() - 0.5);
      const feedbackGivers = shuffled.slice(0, numFeedback);

      for (const emp of feedbackGivers) {
        if (!emp.manager_email || !managerEmails.includes(emp.manager_email)) continue;

        const template = pickRandom(MGR_FEEDBACK_TEMPLATES);
        const createdAt = subDays(subMonths(new Date(), monthsBack), Math.floor(Math.random() * 15));

        const { rows: existing } = await client.query(
          `SELECT id FROM manager_feedback WHERE submitter_user_id = $1 AND submission_period = $2`,
          [emp.id, period]
        );
        if (existing.length > 0) continue;

        await client.query(
          `INSERT INTO manager_feedback (submitter_user_id, manager_email, feedback_text, rating, submission_period, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [emp.id, emp.manager_email, template.text, template.rating, period, createdAt]
        );
        mgrFbCount++;
      }
    }
    console.log(`  Inserted ${mgrFbCount} manager feedback entries.`);

    console.log("Seed complete!");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err: any) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
