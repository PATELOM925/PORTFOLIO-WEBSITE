import {
  CredentialEntry,
  EducationEntry,
  ExperienceEntry,
  ExtracurricularEntry,
  ResearchEntry,
  SkillGroup
} from "@/types/content";

export const siteConfig = {
  name: "Om M. Patel",
  shortName: "Om Patel",
  title: "Om M. Patel | AI Engineer",
  description: "AI Engineer building production AI integrations, data pipelines, and backend systems to help teams make better operational decisions efficiently. Vector AI Scholar with about 2 years across AI, data and research roles.",
  role: "AI Engineer",
  focus: "AI Integration • Data Engineering • NLP",
  location: "Toronto, Ontario, Canada",
  email: "iampatelom@gmail.com",
  phone: "+1 437-212-3702",
  resumePath: "/assets/Om_Resume.pdf?v=2026-10-07",
  profileImage: "/assets/profile-photo.jpg",
  logoPath: "/assets/om-monogram.svg",
  formspreeId: (((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env) || {})["NEXT_PUBLIC_FORMSPREE_ID"] || "xnnjbpve",
  siteUrl: (((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env) || {})["NEXT_PUBLIC_SITE_URL"] || "https://iampatelom.com",
  analyticsToken: (((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env) || {})["NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN"] || ""
};

// Primary items stay visible on tablets; secondary items move into "More" (tablet) or the menu sheet (phone).
export const navigation = [
  { label: "About", href: "/#about", sectionId: "about" },
  { label: "Experience", href: "/#experience", sectionId: "experience" },
  { label: "Education", href: "/#education", sectionId: "education", secondary: true },
  { label: "Research", href: "/#research", sectionId: "research" },
  { label: "Projects", href: "/#projects", sectionId: "projects", routePrefix: "/projects" },
  { label: "Skills", href: "/#skills", sectionId: "skills", secondary: true },
  { label: "Blog", href: "/#blog", sectionId: "blog", routePrefix: "/blog" },
  { label: "Role Fit Check", href: "/#fit-check", sectionId: "fit-check", secondary: true },
  { label: "Certifications", href: "/#certifications", sectionId: "certifications", secondary: true },
  { label: "Extracurriculars", href: "/#extracurricular", sectionId: "extracurricular", secondary: true },
  { label: "Contact", href: "/#contact", sectionId: "contact" }
] as const;

export const socialLinks = [
  { label: "GitHub", href: "https://github.com/PATELOM925" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/om-m-patel" },
  { label: "Kaggle", href: "https://www.kaggle.com/iamommpatel" },
  { label: "X", href: "https://twitter.com/om_m_patel" },
  { label: "Email", href: "mailto:iampatelom@gmail.com" }
];

export const skills: SkillGroup[] = [
  { category: "Languages", items: "TypeScript, Python, Java, SQL, JavaScript, Kotlin, HTML/CSS" },
  {
    category: "ML/NLP & LLM",
    items: "PyTorch, Pandas, NumPy, Scikit-learn, TensorFlow, Hugging Face Transformers, LangChain, LlamaIndex, FAISS, ChromaDB, RAG and evaluation pipelines"
  },
  {
    category: "Agents & Applied AI",
    items: "OpenAI SDK and Agents SDK, Google ADK, Gemini API, multi-agent workflows, MCP servers, human-in-the-loop review, structured prompting, LoRA/QLoRA fine-tuning"
  },
  {
    category: "Robotics & Computer Vision",
    items: "ROS2, OpenCV, YOLOv8, ArUco calibration, pixel-to-robot transforms, OCR with PyTesseract"
  },
  {
    category: "Data Engineering & Backend",
    items: "React, FastAPI, Flask, Next.js, Airflow, PostgreSQL, Supabase, Neo4j, Redis, MongoDB, SQLite, ChromaDB, GeoPandas, REST APIs, ETL pipelines"
  },
  {
    category: "Product, Deployment & Tooling",
    items: "Docker, CI/CD, GitHub, Jira, Vercel, GCP, Playwright, Sentry, Cloudflare, Postman, Azure, Render, Streamlit, Tableau, Power BI"
  }
];

export const education: EducationEntry[] = [
  {
    degree: "Master of Science in Computer Science, Specialization in Artificial Intelligence",
    school: "York University, Toronto, Canada",
    period: "Sep 2025 - Aug 2026",
    gpa: "3.77/4",
    note: "Vector Scholarship in AI, Vector Institute ($17,500 merit award) · Supervisor: Dr. Aijun An",
    relevantCoursework: "Probabilistic Models and Machine Learning, Machine Learning Theory, Data Mining, Fairness and Bias in AI, Data Analytics and Visualization, Introduction to Robotics"
  },
  {
    degree: "Bachelor of Technology in Computer Engineering",
    school: "Pandit Deendayal Energy University, Gandhinagar, India",
    period: "Nov 2021 - May 2025",
    gpa: "3.47/4",
    relevantCoursework: "Computer Vision, Digital Image Processing, Pattern Recognition, Information Retrieval, Natural Language Processing, Big Data Analytics"
  }
];

export const researchEntries: ResearchEntry[] = [
  {
    slug: "low-resource-gujarati-sentiment",
    title: "Sentiment Detection and Cross-Lingual Preservation",
    role: "Research Assistant under Prof. Uyen T. Nguyen (York University) · Manuscript in preparation",
    period: "Mar 2026 - Aug 2026",
    bullets: [
      "Built a Gujarati sentiment-analysis pipeline across translated SST-2 and native GSAC data to evaluate polarity preservation.",
      "Achieved weighted F1 of 0.804 with a MuRIL-based model and a 2,908-entry sentiment lexicon on a held-out GSAC test split.",
      "Kept adaptation and test data disjoint and analyzed polarity shifts, negation errors, mistranslations, and social-text noise for the manuscript."
    ]
  },
  {
    slug: "llms-for-optimization",
    title: "LLMs for Job-Shop Scheduling",
    role: "Course Research under Prof. Aijun An (York University)",
    period: "Sep 2025 - Dec 2025",
    bullets: [
      "Fine-tuned Llama 3.1 8B with 4-bit QLoRA (Unsloth) on an NVIDIA RTX A6000, in a graph-augmented pipeline that converts each instance into a disjunctive graph (PyTorch Geometric) serialized into the prompt.",
      "Pre-processed the noisy STARJOB dataset (~130k to 9,525 usable instances), cutting fine-tuning runtime from 70h to 11.5h."
    ],
    codeUrl: "https://github.com/PATELOM925/LLMs-for-Optimization-Problems"
  },
  {
    slug: "sleep-stage-classification",
    title: "ADCIS 2024 (Springer): Automated Sleep Stage Classification Using Machine Intelligence Techniques",
    role: "Co-author",
    period: "Sep 2024 - Jul 2025",
    bullets: [
      "Surveyed 90+ automated sleep staging studies and organized signal modalities (EEG/ECG/EOG/EMG) and PSG data representations into an end-to-end taxonomy used for system design.",
      "Consolidated model families and evaluation practice (classical ML → deep learning) with reporting guidance around leakage, imbalance, and cross-subject generalization."
    ],
    codeUrl: "https://github.com/PATELOM925/Automated_Sleep_Staging_Techniques",
    publicationUrl: "https://www.researchgate.net/publication/394044040_Automated_Sleep_Stage_Classification_Using_Machine_Intelligence_Techniques_Physiological_Signals_Sleep_Data_Presentation_and_Models"
  }
];

export const industryExperience: ExperienceEntry[] = [
  {
    title: "Applied AI Engineer",
    organization: "BarLens, Toronto",
    period: "Jun 2026 - Aug 2026",
    bullets: [
      "Integrated vision APIs (with routing layer) with Next.js for extracting data to reduce manual work by 64%.",
      "Built an eval layer to measure extraction quality and invoke HITL validation and POS reconciliation on the user dashboard.",
      "Designed Supabase PostgreSQL-backed data storage, with location-based access and private media retention for stock audit.",
      "Automated email ingestion pipeline to normalize POS sales reports (EML, CSV, PDF), avoiding paid access to POS APIs.",
      "Shipped via AI coding agents: Playwright e2e tests, CI checks and Sentry monitoring in production to support reliable releases."
    ]
  },
  {
    title: "Data Engineer",
    organization: "Uarra (formerly Sharperly), Nigeria (Remote)",
    period: "Dec 2024 - Aug 2025",
    bullets: [
      "Built Python ETL pipelines to parse API logs into a PostgreSQL analytics database, serving dashboard endpoints in under 1.5 s.",
      "Refactored a Flask monolith into Dockerized microservices with Redis caching, cutting route latency by 30-40% (1 s to 600 ms).",
      "Coordinated with backend and ML teams to monitor API behavior and support iterative post-deployment improvements."
    ]
  },
  {
    title: "Data Engineering Intern",
    organization: "Uarra (formerly Sharperly), Nigeria (Remote)",
    period: "Mar 2024 - Jul 2024",
    bullets: [
      "Developed geocoding APIs with Flask and GeoPandas to reduce dependency on the Google Maps API, saving about 350 USD monthly.",
      "Scraped and pre-processed 20k+ addresses to create training datasets, producing versioned datasets for ML training.",
      "Built MongoDB-backed credit and Paystack payment flows with rate limiting and CSRF protection. Shipped with Docker on Render."
    ]
  }
];

export const certifications: CredentialEntry[] = [
  { label: "Generative AI with LLMs (Coursera)", url: "https://www.coursera.org/account/accomplishments/certificate/XGBDJAYXTEF7" },
  { label: "LangChain: Chat with your Data (Coursera Project)", url: "https://www.coursera.org/projects/langchain-chat-with-your-data-project?utm_source=link&utm_source=mobile&utm_medium=page_share&utm_content=lih&utm_campaign=card_button" },
  { label: "LLMs: RAG with LlamaIndex & Azure OpenAI (CredsVerse)", url: "https://credsverse.com/credentials/477d05ad-f429-46d3-94b7-2c7dc8695a52" },
  { label: "Applications of AI/ML in Biomedical Signal Processing & CV (PDEU)", url: "https://drive.google.com/file/d/18Sz-wRGKDv-6jrAU1IxtofAjchoHLu14/view?usp=sharing" },
  { label: "Understanding Incubation & Entrepreneurship (NPTEL)", url: "https://internalapp.nptel.ac.in/NOC/NOC24/SEM1/Ecertificates/107/noc24-de06/Course/NPTEL24DE06S55570004730616807.pdf" }
];

export const extracurriculars: ExtracurricularEntry[] = [
  { label: "Winner, AgentShyft Hackathon - built Synapse AI with teacher-orchestrated learning workflows", period: "May 2026" },
  { label: "Vector AI Scholarship Recipient, York University", period: "May 2025" },
  { label: "Top-10 rank in Indian weather prediction at Kaggle ML Olympiad", period: "Apr 2024 - May 2024" },
  { label: "AI/ML Mentor for 10+ students on projects including Autograder and Legal Clarity" },
  { label: "Volunteer, Vardaan Foundation: taught digital literacy to underprivileged students", period: "Jun 2022 - Jul 2022" }
];
