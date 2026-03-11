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
  title: "Om M. Patel | AI/ML Portfolio",
  description: "Vector AI Scholar from York University building NLP, optimization, and applied ML systems.",
  role: "MSc CS (AI) at York University",
  focus: "NLP + Optimization",
  location: "Toronto, Ontario, Canada",
  email: "iampatelom@gmail.com",
  phone: "+1 437-212-3702",
  resumePath: "/assets/Om_Resume.pdf",
  profileImage: "/assets/profile-photo.png",
  logoPath: "/assets/om-monogram.svg",
  formspreeId: (((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env) || {})["NEXT_PUBLIC_FORMSPREE_ID"] || "xnnjbpve",
  siteUrl: (((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env) || {})["NEXT_PUBLIC_SITE_URL"] || "https://iampatelom.com",
  analyticsToken: (((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env) || {})["NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN"] || ""
};

export const navigation = [
  { label: "About", href: "/#about", sectionId: "about" },
  { label: "Skills", href: "/#skills", sectionId: "skills" },
  { label: "Education", href: "/#education", sectionId: "education" },
  { label: "Research", href: "/#research", sectionId: "research" },
  { label: "Experience", href: "/#experience", sectionId: "experience" },
  { label: "Projects", href: "/#projects", sectionId: "projects", routePrefix: "/projects" },
  { label: "Blog", href: "/#blog", sectionId: "blog", routePrefix: "/blog" },
  { label: "Recruiter Bot", href: "/#assistant", sectionId: "assistant" },
  { label: "Certifications", href: "/#certifications", sectionId: "certifications" },
  { label: "Extracurriculars", href: "/#extracurricular", sectionId: "extracurricular" },
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
  { category: "Languages", items: "Python, SQL, JavaScript, TypeScript, Kotlin, Java, HTML/CSS" },
  {
    category: "ML/NLP & LLM",
    items: "PyTorch, TensorFlow, Scikit-learn, Hugging Face Transformers, LangChain, LlamaIndex, spaCy, FAISS, RAG pipelines"
  },
  {
    category: "Optimization & Modeling",
    items: "PyTorch Geometric, disjunctive-graph modeling, LoRA fine-tuning (4-bit), constrained prompting, GLM/GRU anomaly workflows"
  },
  {
    category: "Robotics & Computer Vision",
    items: "ROS2, OpenCV, YOLOv8, ArUco calibration, pixel-to-robot transforms, OCR with PyTesseract"
  },
  {
    category: "Data Engineering & Backend",
    items: "Airflow, Flask, REST API design, MongoDB, GeoPandas, Selenium, Beautiful Soup, ETL pipelines"
  },
  {
    category: "Product, Deployment & Tooling",
    items: "Docker, CI/CD, AWS EC2, Azure, Render, Next.js, Streamlit, Git/GitHub, Postman, PowerBI, Jira, Confluence"
  }
];

export const education: EducationEntry[] = [
  {
    degree: "Master of Science in Computer Science (AI Specialization)",
    school: "York University, Ontario, Canada",
    period: "Sep 2025 - Apr 2027",
    gpa: "3.63/4",
    relevantCoursework: "Data Mining, Probabilistic Models and Machine Learning, Fairness and Bias in AI, Machine Learning Theory, Robotics"
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
    slug: "sleep-stage-classification",
    title: "ADCIS 2024 (Springer): Automated Sleep Stage Classification Using Machine Intelligence Techniques",
    role: "Co-author",
    period: "Sep 2024 - Jul 2025",
    bullets: [
      "Surveyed 90+ automated sleep staging studies and organized signal modalities and PSG data representations into an end-to-end taxonomy.",
      "Consolidated model families and evaluation practices with reporting guidance around data leakage, imbalance, and cross-subject generalization."
    ],
    codeUrl: "https://github.com/PATELOM925/Automated_Sleep_Staging_Techniques",
    publicationUrl: "https://www.researchgate.net/publication/394044040_Automated_Sleep_Stage_Classification_Using_Machine_Intelligence_Techniques_Physiological_Signals_Sleep_Data_Presentation_and_Models"
  },
  {
    slug: "llms-for-optimization",
    title: "LLMs for Optimization: Job Shop Scheduling Optimization (JSSP)",
    role: "Course Research Project, York University",
    period: "Sep 2025 - Dec 2025",
    bullets: [
      "Built a GNN-augmented LLM workflow by converting JSSP instances into disjunctive graphs and explicit machine/precedence constraints.",
      "Processed STARJOB-style data from ~130k raw records to 9,525 usable instances and reduced fine-tuning runtime from 70h to 11.5h with 4-bit LoRA."
    ],
    codeUrl: "https://github.com/PATELOM925/LLMs-for-Optimization-Problems"
  }
];

export const industryExperience: ExperienceEntry[] = [
  {
    title: "Backend & Data Engineering Intern",
    organization: "Uarra (Prev. Sharperly), Nigeria (Remote)",
    period: "Dec 2024 - Aug 2025",
    bullets: [
      "Designed Airflow-powered ETL pipelines for geospatial datasets, improving throughput by around 25%.",
      "Deployed Dockerized services on Render and Azure via CI/CD.",
      "Optimized MongoDB schemas and indexes for low-latency real-time lookups.",
      "Collaborated with ML and product teams to integrate production APIs and improve post-deployment reliability."
    ]
  },
  {
    title: "Data Science Intern",
    organization: "Uarra, Nigeria (Remote)",
    period: "Mar 2024 - Jul 2024",
    bullets: [
      "Built geocoding APIs in Flask + GeoPandas to reduce Google Maps API dependence and cut monthly cost by up to 45%.",
      "Scraped and processed 20k+ addresses to produce versioned datasets for ML training.",
      "Trained and evaluated RNN, Autoencoder, and K-Means models for user behavior prediction, route clustering, and anomaly detection."
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
  { label: "Vector AI Scholarship Recipient, York University", period: "May 2025" },
  { label: "Top-10 rank in Indian weather prediction at Kaggle ML Olympiad", period: "Apr 2024 - May 2024" },
  { label: "AI/ML Mentor for 10+ students on projects including Autograder and Legal Clarity" },
  { label: "Volunteer, Vardaan Foundation: taught digital literacy to underprivileged students", period: "Jun 2022 - Jul 2022" }
];
