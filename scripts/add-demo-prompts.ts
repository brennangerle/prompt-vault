// Simple script to add demo prompts directly to the database
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set, query, orderByChild, equalTo, get } from 'firebase/database';

// Initialize Firebase (using environment variables if available)
const firebaseConfig = {
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://prompt-vault-bw4ot-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const demoPrompts = [
  {
    title: "Code Review Assistant",
    content: `You are an experienced software engineer conducting a thorough code review. Please analyze the following code and provide:

1. **Potential Bugs**: Identify any logical errors, edge cases, or potential runtime issues
2. **Performance Issues**: Highlight inefficient algorithms, memory leaks, or optimization opportunities  
3. **Code Quality**: Comment on readability, maintainability, and adherence to best practices
4. **Security Concerns**: Point out any security vulnerabilities or unsafe practices
5. **Suggestions**: Provide specific, actionable recommendations for improvement

Please be constructive and educational in your feedback, explaining the reasoning behind each suggestion.

[Paste your code here]`,
    tags: ["Code", "Development", "Review"],
    sharing: "global" as const
  },
  {
    title: "Meeting Summary Generator",
    content: `Transform these meeting notes into a professional, structured summary. Please organize the information into:

**Meeting Overview:**
- Date, attendees, and purpose

**Key Discussion Points:**
- Main topics covered with brief summaries

**Decisions Made:**
- Clear list of what was decided

**Action Items:**
- Who is responsible for what, with deadlines if mentioned

**Next Steps:**
- Follow-up meetings or milestones

Keep the tone professional and focus on actionable outcomes.

[Paste your meeting notes here]`,
    tags: ["Business", "Productivity", "Meetings"],
    sharing: "global" as const
  },
  {
    title: "Email Professional Tone Converter",
    content: `Please rewrite the following message to have a professional, courteous tone suitable for workplace communication. Maintain the core message while:

- Using appropriate business language
- Ensuring respectful and clear communication
- Adding proper greetings and closings if missing
- Removing any casual or potentially inappropriate language
- Keeping the message concise but complete

Original message:
[Paste your casual message here]`,
    tags: ["Business", "Communication", "Writing"],
    sharing: "global" as const
  },
  {
    title: "Creative Writing Starter",
    content: `Help me develop a creative story concept. Based on the genre and elements I provide, please generate:

**Character Profiles:**
- Main protagonist with personality, background, and motivation
- Key supporting characters with their roles and relationships

**Setting Details:**
- Time period and location with atmospheric description
- Important locations where the story unfolds

**Plot Framework:**
- Inciting incident that starts the story
- Central conflict or challenge
- Potential plot twists or complications
- Satisfying resolution direction

**Themes to Explore:**
- Underlying messages or questions the story could address

Genre/Elements I want to include:
[Describe your preferred genre, themes, or specific elements]`,
    tags: ["Creative", "Writing", "Storytelling"],
    sharing: "global" as const
  },
  {
    title: "Technical Documentation Writer",
    content: `Create clear, comprehensive technical documentation for the feature/system described below. Structure the documentation with:

**Overview:**
- Purpose and scope of the feature/system
- Target audience and prerequisites

**Technical Specifications:**
- Architecture and components
- Key technical details and requirements

**Implementation Guide:**
- Step-by-step setup or integration instructions
- Code examples with explanations
- Configuration options and parameters

**Usage Examples:**
- Common use cases with practical examples
- Best practices and recommendations

**Troubleshooting:**
- Common issues and solutions
- Error messages and their meanings

**Additional Resources:**
- Related documentation or helpful links

Subject to document:
[Describe the feature, API, system, or process you need documented]`,
    tags: ["Documentation", "Technical", "Development"],
    sharing: "global" as const
  },
  {
    title: "Data Analysis Interpreter",
    content: `Analyze the data/metrics provided and create an insightful interpretation that includes:

**Data Summary:**
- Key statistics and notable figures
- Data quality and completeness assessment

**Trend Analysis:**
- Patterns, trends, and anomalies observed
- Comparison with previous periods if applicable

**Key Insights:**
- What the data reveals about performance/behavior
- Significant correlations or relationships

**Business Implications:**
- What these findings mean for decision-making
- Potential opportunities or concerns highlighted

**Recommendations:**
- Actionable next steps based on the analysis
- Areas requiring further investigation

**Visualization Suggestions:**
- Best chart types to represent key findings
- Important metrics to track going forward

Data to analyze:
[Paste your data, metrics, or describe the dataset]`,
    tags: ["Analytics", "Business", "Data"],
    sharing: "global" as const
  },
  {
    title: "Social Media Content Creator",
    content: `Create engaging social media content based on the topic/message provided. Generate:

**Platform-Specific Posts:**
- LinkedIn: Professional, informative tone
- Twitter/X: Concise, engaging with relevant hashtags
- Instagram: Visual-focused with compelling captions
- Facebook: Community-friendly and conversational

**Content Elements:**
- Hook to grab attention in the first line
- Clear value proposition or key message
- Call-to-action that encourages engagement
- Relevant hashtags for discoverability
- Emoji usage where appropriate

**Engagement Strategies:**
- Questions to spark discussion
- Shareable insights or tips
- Trending topics or current events to tie into

**Content Calendar Ideas:**
- Series of related posts to maintain momentum
- Optimal posting times and frequency suggestions

Topic/Message to promote:
[Describe your product, service, announcement, or message]`,
    tags: ["Marketing", "Social Media", "Content"],
    sharing: "global" as const
  },
  {
    title: "Problem-Solving Framework",
    content: `Guide me through a structured problem-solving approach for the challenge described below. Use this framework:

**1. Problem Definition:**
- Clearly articulate the core problem
- Distinguish symptoms from root causes
- Define success criteria and constraints

**2. Information Gathering:**
- Key questions to ask and data to collect
- Stakeholders to consult
- Assumptions to validate

**3. Root Cause Analysis:**
- Potential underlying causes
- Methods to investigate each cause
- Evidence needed to confirm/eliminate causes

**4. Solution Generation:**
- Multiple potential approaches
- Pros and cons of each option
- Resource requirements and feasibility

**5. Decision Making:**
- Evaluation criteria for solutions
- Risk assessment for top options
- Recommended approach with rationale

**6. Implementation Planning:**
- Key steps and timeline
- Success metrics and checkpoints
- Contingency plans for obstacles

Problem to solve:
[Describe your challenge, decision, or complex situation]`,
    tags: ["Strategy", "Problem-Solving", "Business"],
    sharing: "global" as const
  }
];

async function addDemoPrompts() {
  try {
    console.log('Finding Master Prompter user...');
    
    // Find the super user by email
    const usersRef = ref(database, 'users');
    const userQuery = query(usersRef, orderByChild('email'), equalTo('masterprompter@admin.com'));
    const snapshot = await get(userQuery);
    
    let superUserId: string | null = null;
    if (snapshot.exists()) {
      const userData = snapshot.val();
      superUserId = Object.keys(userData)[0];
      console.log('Found Master Prompter with ID:', superUserId);
    } else {
      console.error('Master Prompter user not found');
      return;
    }
    
    console.log('Creating demo community prompts...');
    
    for (let i = 0; i < demoPrompts.length; i++) {
      const promptData = {
        ...demoPrompts[i],
        createdBy: superUserId
      };
      
      const promptsRef = ref(database, 'prompts');
      const newPromptRef = push(promptsRef);
      await set(newPromptRef, promptData);
      
      console.log(`✓ Created prompt ${i + 1}: ${promptData.title}`);
    }
    
    console.log(`\n🎉 Successfully created ${demoPrompts.length} demo community prompts!`);
    console.log('These prompts are now available in the Community Showcase for all users.');
    
  } catch (error) {
    console.error('Error creating demo prompts:', error);
  }
}

export { demoPrompts, addDemoPrompts };

// Run if called directly
if (require.main === module) {
  addDemoPrompts();
}