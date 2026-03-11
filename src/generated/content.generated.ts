/* eslint-disable */
export const projectRecords = [
  {
    "frontmatter": {
      "title": "Autograder: Precision in Every Grade",
      "slug": "autograder",
      "date": "2024-08-01",
      "preview": "Semi-automated grading system with BERT-based NLP and OCR to evaluate typed and handwritten responses.",
      "tags": [
        "NLP",
        "BERT",
        "OCR",
        "React",
        "Flask"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/AutoGrader",
      "youtubeUrl": "https://youtu.be/oRnjj6-C8ZM?si=bJebTWnANw7fOfsn",
      "featured": true,
      "problem": "Manual grading is slow and inconsistent when submissions include both typed and handwritten responses.",
      "approach": "I combined semantic similarity, OCR extraction, and a grading workflow UI to support semi-automated evaluation.",
      "result": "The project demonstrated how NLP and OCR can reduce repetitive grading effort while still keeping human review in the loop."
    },
    "content": "## Design\nThe main idea was not to remove human evaluation completely, but to shorten the repetitive parts of grading.\n\n## Stack choices\n- BERT-based semantic comparison for meaning-aware answer matching.\n- OCR for scanned or handwritten text extraction.\n- React + Flask for an end-to-end grading flow.\n\n## Practical constraint\nThe system worked best as a reviewer assistant, not as a fully autonomous grader."
  },
  {
    "frontmatter": {
      "title": "ChatPDF AI",
      "slug": "chatpdf-ai",
      "date": "2024-09-20",
      "preview": "Retrieval-grounded document QA system using LangChain and FAISS with agentic query workflows.",
      "tags": [
        "RAG",
        "LangChain",
        "FAISS",
        "Agents",
        "LLM"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/ChatPDF-AI",
      "demoUrl": "https://om-m-patel.streamlit.app/",
      "featured": true,
      "problem": "Users need grounded answers over long PDFs without the model inventing unsupported claims.",
      "approach": "I built a retrieval-first pipeline with chunking, vector indexing, and controlled context assembly before answer generation.",
      "result": "The system was most useful when retrieval quality was treated as the main product surface instead of an invisible backend detail."
    },
    "content": "## Core build\nThis project combines document chunking, embedding-based retrieval, and answer generation into a practical PDF assistant.\n\n## What I learned\n- Chunking strategy affects answer quality more than people expect.\n- Retrieval diagnostics are essential; the model cannot recover from weak context.\n- Grounding checks are necessary if the app is meant to feel trustworthy."
  },
  {
    "frontmatter": {
      "title": "Uber NYC Driver Pay Prediction",
      "slug": "driver-pay-forecasting",
      "date": "2024-06-20",
      "preview": "Comparative ML and deep learning study for Uber NYC driver pay prediction with analysis dashboards.",
      "tags": [
        "Forecasting",
        "LSTM",
        "Random Forest",
        "PowerBI"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/Uber_NYC_Driver_Pay_Prediction",
      "featured": false
    },
    "content": "## Summary\nComparative modeling project across ANN, Random Forest, LSTM, BiLSTM, and hybrid models for pay prediction.\n\n## Highlights\n- Benchmarked multiple model families instead of assuming one sequence model would dominate.\n- Evaluated temporal and location-sensitive pay drivers.\n- Built PowerBI views to make results easier to inspect beyond notebook outputs."
  },
  {
    "frontmatter": {
      "title": "Exam Study Planner",
      "slug": "exam-study-planner",
      "date": "2025-01-18",
      "preview": "Planning assistant to structure exam preparation timelines and task prioritization.",
      "tags": [
        "Productivity",
        "Planning",
        "Python"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/ExamStudyPlanner",
      "featured": false,
      "problem": "Students usually know their deadlines but still struggle to convert them into a realistic revision plan.",
      "approach": "I built a lightweight planning workflow that turns exam constraints into a staged study plan with prioritization logic.",
      "result": "The project emphasized usable planning outputs over complex modeling and helped me think more carefully about decision support UX."
    },
    "content": "## Summary\nThis is a compact planning tool designed around a practical use case: reduce the friction between knowing what to study and deciding what to do next.\n\n## Notes\n- Converts high-level deadlines into an ordered prep plan.\n- Emphasizes sequencing and prioritization.\n- Useful as a small product-thinking project rather than a pure ML artifact."
  },
  {
    "frontmatter": {
      "title": "GreenArm: Vision Guided Robotic Waste Sorting",
      "slug": "greenarm-vision-guided-waste-sorting",
      "date": "2025-12-01",
      "preview": "ROS2 perception-to-manipulation pipeline using YOLOv8, OpenCV transforms, and ArUco calibration for precise robotic sorting.",
      "tags": [
        "Robotics",
        "Computer Vision",
        "ROS2",
        "YOLOv8",
        "OpenCV"
      ],
      "status": "published",
      "featured": true,
      "isPrivateSource": true,
      "problem": "Build an end-to-end robotic workflow that can classify and pick waste objects reliably in a fixed workspace.",
      "approach": "I helped build a ROS2 architecture connecting detection, calibration, coordinate mapping, and arm control.",
      "result": "The system achieved repeatable placement precision once calibration and transform caching were handled carefully."
    },
    "content": "## Summary\nGreenArm was an integration-heavy robotics project rather than a single-model exercise.\n\n## What mattered\n- Stable calibration with ArUco markers.\n- Reliable pixel-to-robot coordinate conversion.\n- Better handling of detection-to-actuation latency.\n- Clear separation between perception logic and arm control."
  },
  {
    "frontmatter": {
      "title": "PixelVault: Image Upload & Gallery Web App",
      "slug": "image-processing-project",
      "date": "2024-04-04",
      "preview": "Full-stack image upload and retrieval app with React frontend, Flask API, and MongoDB-backed image storage.",
      "tags": [
        "React",
        "Flask",
        "MongoDB",
        "REST API",
        "Python"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/Image-Processing-Project---Python-Based-",
      "featured": false,
      "problem": "The original repo is more than a generic image processing exercise. It is really a full upload, retrieval, and gallery workflow with backend persistence.",
      "approach": "I renamed it to reflect the actual implementation: React client, Flask API, image handling routes, and MongoDB-backed storage/retrieval.",
      "result": "The revised framing is clearer for recruiters because it describes the app as a product workflow instead of an overly broad course-project label."
    },
    "content": "## Why I renamed it\nThe old title, \"Image Processing Project (Python-Based)\", was too vague and undersold what the repo actually does.\n\n## What the repo really shows\n- React frontend for image interactions.\n- Flask backend endpoints for upload and retrieval.\n- Persistent data handling with MongoDB.\n- A more product-like gallery app structure than a single algorithm demo.\n\n## Better framing\n\"PixelVault\" makes the project easier to remember and aligns the name with the user-facing behavior in the codebase."
  },
  {
    "frontmatter": {
      "title": "Indian Weather Predictor (Kaggle)",
      "slug": "indian-weather-prediction",
      "date": "2024-05-10",
      "preview": "Regression modeling and feature analysis pipeline for India weather forecasting competition data.",
      "tags": [
        "Regression",
        "XGBoost",
        "EDA",
        "Kaggle"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/Indian-Weather-Predictor-Kaggle",
      "demoUrl": "https://www.kaggle.com/code/iamommpatel/indian-weather-predictor",
      "featured": false
    },
    "content": "## Summary\nCompetition-focused weather forecasting analysis using multiple regression models and systematic error comparison.\n\n## Highlights\n- Compared tree-based and linear baselines before converging on stronger candidates.\n- Used exploratory analysis to understand feature behavior instead of tuning blindly.\n- Reached a top-10 leaderboard finish in the competition context."
  },
  {
    "frontmatter": {
      "title": "Legal Clarity",
      "slug": "legal-clarity",
      "date": "2024-11-10",
      "preview": "Fine-tuned multilingual transformer summarization and translation pipeline for legal text, packaged as a Flask service.",
      "tags": [
        "NLP",
        "Transformers",
        "Flask",
        "PyTorch"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/Legal_Clarity",
      "featured": true,
      "problem": "Legal text is dense, multilingual, and costly to triage manually.",
      "approach": "I fine-tuned transformer models for summarization and translation, then wrapped the workflow in a reusable Flask service.",
      "result": "The project translated research-style NLP work into a more deployable document simplification workflow."
    },
    "content": "## Summary\nThis project focuses on making legal text easier to process through summarization and translation workflows.\n\n## What stands out\n- Fine-tuned Pegasus, T5, and IndicBARTSS variants.\n- Worked across multilingual legal content.\n- Packaged the workflow behind Flask endpoints for easier integration."
  },
  {
    "frontmatter": {
      "title": "LLMs for Optimization Problems",
      "slug": "llms-for-optimization-problems",
      "date": "2025-12-12",
      "preview": "Research-driven project exploring LLM + graph representations for constrained optimization (JSSP and related tasks).",
      "tags": [
        "Optimization",
        "LLM",
        "JSSP",
        "Graph ML"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/LLMs-for-Optimization-Problems",
      "featured": true,
      "problem": "Classical optimization problems carry hard feasibility constraints that vanilla language models often violate.",
      "approach": "I modeled JSSP instances as disjunctive graphs, serialized precedence and machine conflicts explicitly, and paired that representation with LoRA fine-tuning.",
      "result": "The pipeline produced a much more structured optimization workflow and made training/runtime tradeoffs manageable for course-scale experimentation."
    },
    "content": "## What I built\nI treated scheduling as a structure-first problem instead of a pure prompting problem. The project converts job shop instances into graph-shaped representations so the model sees precedence and machine conflicts explicitly.\n\n## Core decisions\n- Serialized machine and operation constraints instead of relying on free-form descriptions.\n- Used disjunctive graphs to preserve conflict structure.\n- Applied 4-bit LoRA fine-tuning to keep experimentation feasible.\n- Focused on failure slices where outputs looked plausible but violated constraints.\n\n## What mattered most\nThe project became stronger once I stopped asking whether the LLM could \"solve optimization\" in the abstract and started asking whether the representation exposed enough constraint information for the model to reason over."
  },
  {
    "frontmatter": {
      "title": "Meme App",
      "slug": "meme-app",
      "date": "2023-08-01",
      "preview": "Android Kotlin app using Reddit APIs and Glide for lightweight meme streaming UX.",
      "tags": [
        "Android",
        "Kotlin",
        "Retrofit",
        "Glide"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/MemeApp",
      "featured": false
    },
    "content": "## Summary\nAndroid app focused on media consumption and API-driven content loading.\n\n## Highlights\n- Consumed Reddit APIs via Retrofit.\n- Used Glide for image loading and caching.\n- Built a smooth Kotlin-based browsing flow for continuous content consumption."
  },
  {
    "frontmatter": {
      "title": "PMML Project: Traffic Anomaly Detection in Toronto",
      "slug": "pmml-traffic-anomaly-detection",
      "date": "2025-12-05",
      "preview": "Anomaly detection on urban traffic streams comparing probabilistic GLM and sequence-model (GRU) approaches.",
      "tags": [
        "Anomaly Detection",
        "PMML",
        "GLM",
        "GRU",
        "Time Series"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/PMML_Project",
      "featured": true,
      "problem": "Traffic streams contain strong temporal patterns, noise, and event-driven spikes that make anomaly detection easy to overfit.",
      "approach": "I compared a probabilistic GLM baseline against a GRU sequence model, then analyzed how calibration and divergence-based scoring behaved under real traffic variation.",
      "result": "The work clarified when simpler probabilistic models remain competitive and where sequence models help once temporal context matters."
    },
    "content": "## Focus\nThis project was less about chasing one model score and more about understanding what different anomaly detectors assume.\n\n## What I compared\n- Poisson/GLM-style probabilistic modeling for interpretable traffic count behavior.\n- GRU-based sequence modeling for temporal dependency capture.\n- Divergence-oriented anomaly scoring to inspect shifts in learned behavior.\n\n## Main lesson\nIf the anomaly score is poorly calibrated, a more complex model can still produce noisy operational signals. Evaluation had to stay tied to practical alert usefulness, not just loss curves."
  },
  {
    "frontmatter": {
      "title": "SQL-AI",
      "slug": "sql-ai",
      "date": "2024-03-18",
      "preview": "Natural-language interface for uploaded SQL databases, translating prompts into executable SQL queries.",
      "tags": [
        "LLM",
        "SQL",
        "NL2SQL",
        "Data Apps"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/SQL-AI",
      "featured": false
    },
    "content": "## Summary\nUser-facing app that converts natural language prompts into SQL queries for uploaded databases.\n\n## Highlights\n- Built a natural-language-to-query workflow with practical execution support.\n- Framed the problem as a usability layer over databases, not only a prompting exercise.\n- Useful for showing how LLM interfaces can support analyst-style workflows."
  }
] as const;

export const blogRecords = [
  {
    "frontmatter": {
      "title": "GreenArm Notes: Detection-to-Actuation Integration Pitfalls",
      "slug": "greenarm-robotics-integration-notes",
      "date": "2025-11-20",
      "excerpt": "My practical lessons from connecting YOLO detection, camera calibration, and Kinova arm control in a ROS2 waste-sorting pipeline.",
      "tags": [
        "MLOps",
        "Optimization",
        "Research Notes"
      ],
      "status": "published"
    },
    "content": "GreenArm taught me that robotics projects often fail at the interfaces, not inside the individual components. A detector can look good, a robot arm can move correctly, and the system can still miss the object because calibration, frame transforms, or timing assumptions are slightly off.\n\nThe most important part of the pipeline was not YOLO itself. It was the chain from image-space detection to a stable robot-space action. Camera calibration and ArUco-based workspace alignment ended up being the pieces that determined whether the rest of the system felt reliable. Small errors there propagated into picking mistakes very quickly.\n\nAnother lesson was that cached transforms and environment assumptions can help or hurt depending on how disciplined the setup is. In a fixed workspace, caching saves time and reduces repeated computation. But if the camera shifts or the workspace drifts and the cache is treated as truth, the system quietly degrades. That makes validation routines just as important as the calibration logic itself.\n\nWhat I took away from this project is that end-to-end robotics reliability comes from integration discipline. Vision accuracy alone is not enough. The actual product question is whether detection, geometry, and actuation stay coherent together under real operating conditions."
  },
  {
    "frontmatter": {
      "title": "LLMs for Optimization: What Worked in My JSSP Pipeline",
      "slug": "jssp-constraint-serialization-notes",
      "date": "2025-12-18",
      "excerpt": "My practical lessons from modeling Job Shop Scheduling with disjunctive graphs, constrained prompts, and LoRA fine-tuning.",
      "tags": [
        "Optimization",
        "NLP",
        "MLOps",
        "Research Notes"
      ],
      "status": "published"
    },
    "content": "When I started working on LLMs for optimization, the tempting framing was to ask whether a language model could solve Job Shop Scheduling directly. That turned out to be the wrong first question. The useful question was whether I could expose the structure of the optimization problem clearly enough for the model to reason over it.\n\nThe most important change I made was representing each instance as a disjunctive graph and then serializing the hard constraints explicitly. Once precedence rules and machine conflicts were visible in the input format, the model outputs became easier to inspect. They were still wrong in many cases, but they were wrong in more diagnosable ways.\n\nAnother practical lesson was that feasibility matters more than fluency. A schedule can sound coherent and still be invalid. I had to inspect violations systematically instead of treating natural-sounding output as a sign of progress. That forced me to track constraint failures, not just generic text quality.\n\nFine-tuning also became much more manageable after I reduced the runtime burden with 4-bit LoRA. That did not magically solve the core reasoning problem, but it let me iterate faster and test representation changes without turning every experiment into a multi-day wait.\n\nThe biggest caveat is that optimization tasks punish vague prompting. If the structure is underspecified, the model fills gaps with plausible but infeasible decisions. My main takeaway is simple: for constrained optimization, representation design is the real work. The model only becomes useful after the structure is explicit enough to support valid reasoning."
  },
  {
    "frontmatter": {
      "title": "PMML Project: GLM vs GRU for Traffic Anomaly Detection",
      "slug": "pmml-glm-vs-gru-anomaly-notes",
      "date": "2025-12-05",
      "excerpt": "My lessons from comparing Poisson GLM and GRU models, plus why KL-style divergence needs careful calibration in noisy traffic streams.",
      "tags": [
        "MLOps",
        "Research Notes",
        "Optimization"
      ],
      "status": "published"
    },
    "content": "In the PMML project, I compared a probabilistic GLM-style baseline with a GRU sequence model for traffic anomaly detection. What I liked about this setup is that it exposed a familiar tradeoff: interpretability and stability versus expressive temporal modeling.\n\nThe GLM side gave me a cleaner picture of what the model believed normal traffic should look like. That made it easier to reason about spikes, count behavior, and feature influence. The GRU was better at absorbing temporal context, but it also made debugging harder because a strange anomaly score could come from a much deeper interaction of sequence dynamics.\n\nOne of the most important caveats was anomaly scoring itself. Divergence-style scores can look mathematically appealing while still being operationally noisy. In traffic streams, daily rhythms, local disruptions, and sensor irregularities can all create distribution shifts that are not equally meaningful. If I did not calibrate the thresholding carefully, the system could produce many alerts that were technically explainable but not useful.\n\nThis project reinforced a habit I want to keep: a stronger model is not automatically a better monitoring system. If an anomaly detector cannot be interpreted, calibrated, and trusted in context, it becomes hard to deploy responsibly. The useful evaluation question is not only \"which model wins?\" but also \"which model produces signals someone could act on without constant manual cleanup?\""
  },
  {
    "frontmatter": {
      "title": "ChatPDF RAG Notes: Retrieval Quality Beats Model Size",
      "slug": "rag-evaluation-checklist",
      "date": "2025-10-10",
      "excerpt": "How I tuned my ChatPDF pipeline by focusing on retrieval diagnostics, grounding checks, and failure slices before model tweaks.",
      "tags": [
        "RAG",
        "NLP",
        "MLOps",
        "Research Notes"
      ],
      "status": "published"
    },
    "content": "One of the easiest mistakes in RAG systems is over-focusing on the generator. In my ChatPDF work, the faster gains came from retrieval quality, chunking discipline, and grounding checks rather than from changing the language model.\n\nWhen answers were weak, the first thing I needed to know was whether the right evidence had even been retrieved. If the top chunks were wrong or incomplete, no downstream prompt was going to fix that consistently. That pushed me to inspect retrieval recall, chunk boundaries, and failure slices before doing any model-level tuning.\n\nI also learned that answer quality should be judged against support, not style. A polished answer that cites the wrong context is worse than a simpler answer that stays faithful to the document. That is especially important for PDF QA, where users often trust confident wording too easily.\n\nMy working rule now is straightforward: retrieval is the product backbone of a RAG system. If chunking, indexing, and evidence selection are weak, the rest of the stack becomes an expensive way to hide the real problem."
  }
] as const;
