/* eslint-disable */
export const projectRecords = [
  {
    "frontmatter": {
      "title": "Autograder: Precision in Every Grade",
      "slug": "autograder",
      "date": "2023-11-30",
      "preview": "Semi-automated grading system with BERT-based NLP and OCR to evaluate typed and handwritten responses.",
      "tags": [
        "NLP",
        "BERT",
        "spaCy",
        "OCR",
        "React",
        "Flask"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/AutoGrader",
      "youtubeUrl": "https://youtu.be/oRnjj6-C8ZM?si=bJebTWnANw7fOfsn",
      "featured": false,
      "problem": "Manual grading is slow and inconsistent when submissions include both typed and handwritten responses.",
      "approach": "I combined semantic similarity, OCR extraction, and a grading workflow UI to support semi-automated evaluation.",
      "result": "The project demonstrated how NLP and OCR can reduce repetitive grading effort while still keeping human review in the loop.",
      "category": "NLP & ML Research",
      "highlight": "Video demo",
      "pipeline": [
        "Typed or handwritten answer",
        "OCR (PyTesseract)",
        "BERT semantic similarity",
        "Suggested score",
        "Human review"
      ]
    },
    "content": "## Highlights\n- Led a 6-person team to build an auto-grading pipeline (BERT-uncased, spaCy, PyTesseract) with a React front-end and Flask backend, enabling semi-automated grading for handwritten and typed responses.\n\n## Design\nThe main idea was not to remove human evaluation completely, but to shorten the repetitive parts of grading.\n\n## Stack choices\n- BERT-based semantic comparison for meaning-aware answer matching.\n- OCR for scanned or handwritten text extraction.\n- React + Flask for an end-to-end grading flow.\n\n## Practical constraint\nThe system worked best as a reviewer assistant, not as a fully autonomous grader."
  },
  {
    "frontmatter": {
      "title": "ChatPDF AI",
      "slug": "chatpdf-ai",
      "date": "2024-02-28",
      "preview": "Retrieval-first document QA with LangChain + FAISS and OpenAI Agents SDK workflows, reaching 80% accuracy on a manual test set (N ≤ 50).",
      "tags": [
        "RAG",
        "LangChain",
        "FAISS",
        "OpenAI Agents SDK",
        "Streamlit"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/ChatPDF-AI",
      "featured": false,
      "problem": "Users need grounded answers over long PDFs without the model inventing unsupported claims.",
      "approach": "I built a retrieval-first pipeline with LangChain chunking and FAISS vector search, then added OpenAI Agents SDK workflows for document querying and response generation.",
      "result": "The Streamlit app reached 80% accuracy on a manual test set (N ≤ 50) with answers grounded in source text.",
      "category": "Applied AI & Agents",
      "pipeline": [
        "Upload PDF",
        "LangChain chunking",
        "Embeddings",
        "FAISS index",
        "Top-k retrieval",
        "Agentic answer (OpenAI Agents SDK)",
        "Streamlit UI"
      ],
      "highlight": "80% on manual test set"
    },
    "content": "## Highlights\n- Built a retrieval-first document QA system using LangChain and FAISS to ground answers from source text.\n- Integrated Agents SDK for agentic workflows in document querying and response generation, resulting in 80% accuracy on a manual test set (N ≤ 50). Deployed on Streamlit.\n\n## Core build\nThis project combines LangChain document chunking, embedding-based FAISS vector search, and OpenAI Agents SDK workflows for querying and answer generation in a Streamlit app.\n\n## What I learned\n- Chunking strategy affects answer quality more than people expect.\n- Retrieval quality limits answer quality; the model cannot recover from weak context.\n- Retrieved passages should remain inspectable when assessing an answer."
  },
  {
    "frontmatter": {
      "title": "ClawCompass",
      "slug": "clawcompass",
      "date": "2026-05-26",
      "preview": "Capability broker that routes agent tasks to the right tool, redacts sensitive context, and gates paid execution.",
      "tags": [
        "AI Agents",
        "TypeScript",
        "x402",
        "Security",
        "Marketplace"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/ClawCompass",
      "featured": false,
      "problem": "Agent builders lose time choosing, configuring, and trusting the growing mix of skills, plugins, MCP servers, and sub-agents.",
      "approach": "Our team built a broker that analyzes a task, redacts sensitive context, ranks capabilities, creates payment-gated transactions, and pauses high-risk actions for approval.",
      "result": "The local MVP delivers buyer and seller flows, x402 payment-state checks, capability execution, transaction history, and outcome reputation tracking.",
      "category": "Applied AI & Agents",
      "pipeline": [
        "Agent task",
        "Capability routing",
        "Context redaction",
        "x402 payment gate",
        "Execution",
        "Reputation update"
      ]
    },
    "content": "## What I built\n\n- Routed agent requests to ranked capabilities based on task, context, budget, and constraints.\n- Redacted secret-like inputs before recommendation and execution.\n- Enforced payment and explicit-approval gates before protected actions.\n- Built buyer, seller, transaction, security, and reputation views for the demo workflow.\n\n## Hackathon context\n\nClawCompass was built for the OpenClaw / GOAT Toronto Tech Week hackathon. External wallet, x402, and mainnet registration steps stayed behind explicit approval gates."
  },
  {
    "frontmatter": {
      "title": "Uber NYC Driver Pay Prediction",
      "slug": "driver-pay-forecasting",
      "date": "2024-05-31",
      "preview": "Compared ML and deep learning models for Uber NYC driver pay, reaching almost 12% lower RMSE than baseline, with Tableau feature analysis.",
      "tags": [
        "Forecasting",
        "LSTM",
        "Random Forest",
        "Tableau"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/Uber_NYC_Driver_Pay_Prediction",
      "featured": false,
      "category": "Data Engineering & Analytics",
      "highlight": "12% lower RMSE"
    },
    "content": "## Highlights\n- Compared ML-DL models, ran architecture and hyperparameter searches achieving almost 12% lower RMSE vs. baseline.\n- Visualized features affecting driver pay on Tableau.\n\n## Summary\nComparative modeling project across ANN, Random Forest, LSTM, BiLSTM, and hybrid models for pay prediction.\n\n## Highlights\n- Benchmarked multiple model families instead of assuming one sequence model would dominate.\n- Evaluated temporal and location-sensitive pay drivers.\n- Built Tableau views to make results easier to inspect beyond notebook outputs."
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
      "result": "The project emphasized usable planning outputs over complex modeling and helped me think more carefully about decision support UX.",
      "category": "Apps & Tools"
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
      "github": "https://github.com/Ali7109/GreenArm",
      "demoUrl": "https://green-arm.vercel.app",
      "featured": false,
      "problem": "Build an end-to-end robotic workflow that can classify and pick waste objects reliably in a fixed workspace.",
      "approach": "I helped build a ROS2 architecture connecting detection, calibration, coordinate mapping, and arm control.",
      "result": "The system achieved repeatable placement precision once calibration and transform caching were handled carefully.",
      "category": "Computer Vision & Robotics",
      "highlight": "Live demo",
      "pipeline": [
        "Camera frame",
        "YOLOv8 detection",
        "ArUco calibration",
        "Pixel-to-robot transform",
        "Arm pick & place"
      ]
    },
    "content": "## Summary\nGreenArm was an integration-heavy robotics project rather than a single-model exercise.\n\n## What mattered\n- Stable calibration with ArUco markers.\n- Reliable pixel-to-robot coordinate conversion.\n- Better handling of detection-to-actuation latency.\n- Clear separation between perception logic and arm control."
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
      "featured": false,
      "category": "Data Engineering & Analytics",
      "highlight": "Kaggle top-10"
    },
    "content": "## Summary\nCompetition-focused weather forecasting analysis using multiple regression models and systematic error comparison.\n\n## Highlights\n- Compared tree-based and linear baselines before converging on stronger candidates.\n- Used exploratory analysis to understand feature behavior instead of tuning blindly.\n- Reached a top-10 leaderboard finish in the competition context."
  },
  {
    "frontmatter": {
      "title": "Interview Lens",
      "slug": "interview-lens",
      "date": "2026-06-05",
      "preview": "ARI module that turns a candidate's take-home project into a structured, role-specific interview brief.",
      "tags": [
        "Applied AI",
        "Next.js",
        "OpenAI",
        "PostgreSQL",
        "Security"
      ],
      "status": "published",
      "featured": false,
      "problem": "Interviewers can spend an hour reading an unfamiliar take-home project before they know which technical decisions to probe.",
      "approach": "We built an ARI module that ingests code or a public repository and returns a structured brief, architecture notes, file-grounded questions, answer rubrics, and a signal report.",
      "result": "The module supports live notes and scoring, role-based candidate pipelines, tenant isolation, and guarded handling of untrusted project content.",
      "category": "Applied AI & Agents",
      "pipeline": [
        "Take-home repository",
        "Untrusted-content guard",
        "Project analysis",
        "Role-specific rubric",
        "Interview brief",
        "Live notes & scoring"
      ]
    },
    "content": "## What I built\n\n- Turned candidate code and README content into a structured interview brief in one analysis flow.\n- Generated easy, medium, and hard questions tied to specific files, with strong-answer rubrics.\n- Added live interviewer notes, scoring, and role-based pipeline summaries.\n- Treated candidate content as untrusted input with prompt-injection guards, schema validation, and sanitized rendering.\n\n## Source availability\n\nInterview Lens was built as an ARI hackathon module. The local project checkout has no verified public GitHub remote, so this portfolio does not publish a repository link."
  },
  {
    "frontmatter": {
      "title": "Legal Clarity",
      "slug": "legal-clarity",
      "date": "2024-11-30",
      "preview": "Fine-tuned multilingual transformer summarization and translation pipeline for legal text, packaged as a Flask service.",
      "tags": [
        "NLP",
        "Transformers",
        "Flask",
        "PyTorch"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/Legal_Clarity",
      "featured": false,
      "problem": "Legal text is dense, multilingual, and costly to triage manually.",
      "approach": "I fine-tuned transformer models for summarization and translation, then wrapped the workflow in a reusable Flask service.",
      "result": "The project translated research-style NLP work into a more deployable document simplification workflow.",
      "category": "NLP & ML Research",
      "pipeline": [
        "Legal document",
        "Fine-tuned summarizer",
        "Translation",
        "Flask inference API"
      ]
    },
    "content": "## Highlights\n- Fine-tuned transformer models (Pegasus, T5, IndicBART) in PyTorch to summarize and translate long-form, multilingual legal text for faster review.\n- Packaged the pipeline into a Flask service for repeatable inference and downstream integration.\n\n## Summary\nThis project focuses on making legal text easier to process through summarization and translation workflows.\n\n## What stands out\n- Fine-tuned Pegasus, T5, and IndicBART variants.\n- Worked across multilingual legal content.\n- Packaged the workflow behind Flask endpoints for easier integration."
  },
  {
    "frontmatter": {
      "title": "LLMs for Job-Shop Scheduling",
      "slug": "llms-for-optimization-problems",
      "date": "2025-12-12",
      "preview": "Course research on fine-tuning Llama 3.1 8B with graph-augmented prompts for job-shop scheduling (JSSP).",
      "tags": [
        "Optimization",
        "LLM",
        "QLoRA",
        "JSSP",
        "PyTorch Geometric"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/LLMs-for-Optimization-Problems",
      "featured": true,
      "featuredOrder": 5,
      "problem": "Classical optimization problems carry hard feasibility constraints that vanilla language models often violate.",
      "approach": "Our team of three modeled JSSP instances as disjunctive graphs, serialized precedence and machine conflicts into the prompt, and fine-tuned Llama 3.1 8B with 4-bit QLoRA.",
      "result": "The pipeline produced a much more structured optimization workflow and made training/runtime tradeoffs manageable for course-scale experimentation.",
      "category": "NLP & ML Research",
      "highlight": "70h → 11.5h fine-tuning",
      "pipeline": [
        "JSSP instance",
        "Disjunctive graph",
        "Serialized constraints",
        "4-bit QLoRA fine-tune",
        "Schedule output"
      ]
    },
    "content": "## Highlights\n- Fine-tuned Llama 3.1 8B with 4-bit QLoRA (Unsloth) on an NVIDIA RTX A6000, in a graph-augmented pipeline that converts each instance into a disjunctive graph (PyTorch Geometric) serialized into the prompt.\n- Pre-processed the noisy STARJOB dataset (~130k to 9,525 usable instances), cutting fine-tuning runtime from 70h to 11.5h.\n\nCourse research project under Prof. Aijun An at York University, built in a team of three.\n\n## What I built\nI treated scheduling as a structure-first problem instead of a pure prompting problem. The project converts job shop instances into graph-shaped representations so the model sees precedence and machine conflicts explicitly.\n\n## Core decisions\n- Serialized machine and operation constraints instead of relying on free-form descriptions.\n- Used disjunctive graphs to preserve conflict structure.\n- Applied 4-bit QLoRA fine-tuning to keep experimentation feasible.\n- Focused on failure slices where outputs looked plausible but violated constraints.\n\n## What mattered most\nThe project became stronger once I stopped asking whether the LLM could \"solve optimization\" in the abstract and started asking whether the representation exposed enough constraint information for the model to reason over."
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
      "featured": false,
      "category": "Apps & Tools"
    },
    "content": "## Summary\nAndroid app focused on media consumption and API-driven content loading.\n\n## Highlights\n- Consumed Reddit APIs via Retrofit.\n- Used Glide for image loading and caching.\n- Built a smooth Kotlin-based browsing flow for continuous content consumption."
  },
  {
    "frontmatter": {
      "title": "Toronto Traffic Anomaly Detection",
      "slug": "pmml-traffic-anomaly-detection",
      "date": "2025-12-05",
      "preview": "Cut hourly traffic forecast error by 54% with a GRU, then showed the simpler Poisson GLM is the better anomaly alarm (ROC-AUC 0.94 vs 0.71).",
      "tags": [
        "Anomaly Detection",
        "Time Series",
        "PyTorch",
        "GRU",
        "Poisson GLM"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/Toronto-Urban-Traffic-Anomaly-Detection",
      "featured": true,
      "featuredOrder": 4,
      "problem": "Traffic counts carry strong daily and weekly patterns, noise, and event-driven spikes, so an anomaly detector can forecast well and still raise poor alerts.",
      "approach": "I trained a Poisson GLM and a GRU sequence model on 2020-2024 hourly counts, tested both on held-out 2025 data, and scored anomalies with KL divergence.",
      "result": "The GRU cut forecast RMSE by 54% (890 to 407) on an unseen year, but the interpretable GLM was the better alarm: ROC-AUC 0.94 vs 0.71 and F1 0.49 vs 0.14.",
      "category": "NLP & ML Research",
      "highlight": "54% lower RMSE",
      "pipeline": [
        "Hourly traffic counts",
        "Poisson GLM baseline",
        "GRU sequence model",
        "KL-divergence anomaly scoring",
        "Held-out 2025 evaluation"
      ]
    },
    "content": "## Highlights\n- Cut hourly traffic forecast error by 54% (RMSE 890 to 407) with a GRU in PyTorch over a Poisson GLM baseline, tested on an unseen year (2025) of City of Toronto counts.\n- Showed the simpler GLM is the better alarm: with KL-divergence anomaly scoring it reached ROC-AUC 0.94 vs 0.71 for the GRU (F1 0.49 vs 0.14).\n- Built the dataset from 306k raw 15-minute count records across 3,800+ locations, aggregated to hourly, with 2025 held out so no future data reached training.\n\nSolo course paper for Probabilistic Models & Machine Learning at York University.\n\n## Focus\nThis project was less about chasing one model score and more about understanding what different anomaly detectors assume.\n\n## What I compared\n- A Poisson GLM for interpretable modeling of traffic count behavior.\n- A GRU sequence model for temporal dependency capture.\n- KL-divergence anomaly scoring to inspect shifts between expected and observed behavior.\n\n## Main lesson\nThe better forecaster was not the better detector. If the anomaly score is poorly calibrated, a more complex model can still produce noisy operational signals, so evaluation had to stay tied to practical alert usefulness, not just loss curves.\n\n## Limits\n- The two models do not see the same inputs: the GRU reads the previous 24 observed counts, while the GLM gets four calendar and event features and no history. Part of the forecast gap comes from that.\n- The anomaly labels are heuristics built from the 2025 data itself, so F1 and ROC-AUC depend on those rules.\n- The counts are short surveys at many locations, not one continuous series, and the saved run scales and windows the data across locations. A per-location rerun with train-only scaling is the next step."
  },
  {
    "frontmatter": {
      "title": "Remote Codex Control",
      "slug": "remote-codex-control",
      "date": "2026-05-14",
      "preview": "Human-approval layer for autonomous coding agents: approve, steer or deny each tool action from a private Telegram chat while execution stays local.",
      "tags": [
        "AI Agents",
        "HITL",
        "TypeScript",
        "SQLite",
        "Security"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/Remote-Codex-Control-Public",
      "demoUrl": "/demos/remote-codex-control",
      "featured": true,
      "featuredOrder": 3,
      "problem": "Autonomous coding agents run commands and edit files on your machine, but approvals are stuck at the desk. Stepping away means the agent either stalls or runs without review.",
      "approach": "I built a local-first supervision layer: the agent keeps running on the local machine, and each command, file change and permission request goes to a private Telegram chat where one trusted operator approves, steers or denies it.",
      "result": "A public alpha in about 21,000 lines of TypeScript with 170 automated tests, CI, SQLite state, a chat allowlist, stale-approval protection and a documented threat model.",
      "category": "Applied AI & Agents",
      "highlight": "Human-in-the-loop",
      "pipeline": [
        "Agent requests an action",
        "Policy checks",
        "Approval sent to Telegram",
        "Operator approves, steers or denies",
        "Action runs locally",
        "Event journal"
      ]
    },
    "content": "## Highlights\n- Built a human-approval layer for autonomous coding agents: an operator approves, steers or denies each tool action from a private Telegram chat while execution stays on the local machine.\n- Directed AI coding agents to produce 17k+ lines of TypeScript with SQLite state, a chat allowlist, stale-approval protection and a documented threat model.\n\n## Try it\n\n- [Approval replay](/demos/remote-codex-control): step through a real session between an operator and a coding agent.\n- [Web console demo](https://rcc-demo.iampatelom.workers.dev): the project's web console on a simulated Mac. It uses made-up data and makes no network calls.\n- One-line install on a Mac, with a guided setup for your own Telegram bot: see the [README](https://github.com/PATELOM925/Remote-Codex-Control-Public#quick-install).\n\n## How it works\n\n- Connects to the coding agent's app server and streams turn and tool-call events to the operator.\n- Routes command, file-change and permission requests to Telegram with the project, thread and action shown.\n- Accepts replies only from allowlisted chat IDs and rejects expired or superseded approvals.\n- Records agent events and approvals in a local SQLite journal.\n\n## Safety decisions\n\n- Execution never leaves the local machine. Telegram is the control surface, not a remote runner.\n- Uploaded files are treated as untrusted context, and the threat model covers prompt injection and stale-approval replay.\n- Model and reasoning-effort changes apply to the next turn, never in the middle of an action.\n\n## Status\n\nPublic alpha for one machine and one trusted operator. The web console and the relay in the repository are experimental; the relay is single-operator and is not offered as a shared service."
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
      "featured": false,
      "category": "Applied AI & Agents"
    },
    "content": "## Summary\nUser-facing app that converts natural language prompts into SQL queries for uploaded databases.\n\n## Highlights\n- Built a natural-language-to-query workflow with practical execution support.\n- Framed the problem as a usability layer over databases, not only a prompting exercise.\n- Useful for showing how LLM interfaces can support analyst-style workflows."
  },
  {
    "frontmatter": {
      "title": "Synapse AI",
      "slug": "synapse-ai",
      "date": "2026-05-31",
      "preview": "Multi-agent tutoring platform that turns uploaded materials into personalized study outputs with teacher oversight.",
      "tags": [
        "AI Agents",
        "MCP",
        "FastAPI",
        "Supabase",
        "Next.js",
        "HITL"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/Synapse-AI",
      "featured": true,
      "featuredOrder": 1,
      "problem": "Students need personalized study support, but teachers also need visibility into diagnostics, progress, and the learning materials being generated.",
      "approach": "Our team of three combined a multi-agent backend, an MCP server for course material, FastAPI, and Next.js to generate notes, flashcards, quizzes, podcasts, and streamed tutoring from uploaded course materials.",
      "result": "Synapse AI won the AgentShyft Hackathon in May 2026.",
      "category": "Applied AI & Agents",
      "highlight": "Hackathon winner",
      "pipeline": [
        "Upload learning material",
        "Diagnostics",
        "Agent planner",
        "Notes, flashcards, quizzes, podcasts",
        "Teacher review",
        "Student study & analytics"
      ]
    },
    "content": "## Highlights\n- Won the AgentShyft Hackathon with a multi-agent tutoring platform: agents call course-material tools through an MCP server and stream answers over SSE.\n- Built the teacher side in FastAPI and Supabase: classroom invites, material uploads, and class APIs.\n- The platform turns uploaded learning materials into personalized study outputs such as notes, flashcards, quizzes, and podcasts (Next.js, ElevenLabs API).\n\n## My contribution\n\nI built the teacher side of the backend in FastAPI and Supabase: classroom invites, material uploads, class APIs, and the database migration behind them. I also added the endpoint that picks a student's weakest topics and starts the diagnostic agent. My teammates built the agent runtime and the frontend.\n\n## Why the workflow mattered\n\nThe system was designed around teacher orchestration rather than a standalone chatbot. Generated learning material stays connected to source content, student needs, and teacher oversight.\n\n## Recognition\n\nWinner, AgentShyft Hackathon, May 2026."
  },
  {
    "frontmatter": {
      "title": "TTC Interactive Dashboard",
      "slug": "ttc-interactive-dashboard",
      "date": "2026-04-30",
      "preview": "End-to-end TTC reliability platform covering 1 million+ delay events across bus, subway, GTFS, and live-alert data.",
      "tags": [
        "Data Engineering",
        "Streamlit",
        "DuckDB",
        "Parquet",
        "GTFS-RT"
      ],
      "status": "published",
      "github": "https://github.com/PATELOM925/TTC-PULSE",
      "demoUrl": "/demos/ttc-pulse",
      "featured": true,
      "featuredOrder": 2,
      "problem": "TTC delay history, schedules, route metadata, and live alerts arrive in different formats, which makes reliable route and station analysis difficult.",
      "approach": "Our team built a reproducible DuckDB and Parquet pipeline, linked delay records to GTFS entities, and served the analytical marts through a multi-page Streamlit dashboard.",
      "result": "The platform turns 1 million+ normalized delay events into route, station, time-pattern, cause, and live-alert views with explicit data-quality checks.",
      "category": "Data Engineering & Analytics",
      "highlight": "1M+ delay events",
      "pipeline": [
        "TTC delay data + GTFS + live alerts",
        "Normalize & join",
        "DuckDB / Parquet marts",
        "Route & station quality checks",
        "Streamlit views + AI assistant"
      ]
    },
    "content": "## Highlights\n- Co-developed a Python ingestion and normalization pipeline joining TTC delay data with static GTFS and live service alerts.\n- Processed over 1 million delay events into DuckDB and Parquet data marts, with checks for unmatched route and station mappings and reproducible Streamlit views.\n- The dashboard includes an in-app AI chat assistant, grounded on the analytical marts, for follow-up questions.\n\n## Data workflow\n\n- Processed over 1 million bus and subway delay events into query-ready DuckDB and Parquet marts.\n- Linked historical records to static GTFS routes and stations, with QA for unmatched and ambiguous mappings.\n- Added GTFS-RT service-alert ingestion and validation alongside the historical data.\n- Structured the pipeline as raw, bronze, silver, and gold layers for repeatable rebuilds.\n\n## Dashboard focus\n\n- Ranked recurring route and station hotspots using frequency, severity, regularity, and cause mix.\n- Built views for monthly trends, weekday-hour patterns, cause signatures, and entity drill-downs.\n- Compared captured live alerts with historical reliability signals and surfaced coverage limits.\n- Kept metric definitions, lineage, and data-quality caveats visible in the interface.\n\n## Live dashboard\n\nThe dashboard runs on this site at [/demos/ttc-pulse](/demos/ttc-pulse). It reads small files exported from the gold marts of the repository."
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
    "content": "GreenArm taught me that robotics projects often fail at the interfaces, not inside the individual components. A detector can look good, a robot arm can move correctly, and the system can still miss the object because calibration, frame transforms, or timing assumptions are slightly off.\n\n```pipeline\n{\"title\": \"Detection-to-actuation chain\", \"steps\": [\"Camera frame\", \"YOLOv8 detection\", \"ArUco workspace calibration\", \"Pixel-to-robot transform\", \"Arm pick & place\"]}\n```\n\nThe most important part of the pipeline was not YOLO itself. It was the chain from image-space detection to a stable robot-space action. Camera calibration and ArUco-based workspace alignment ended up being the pieces that determined whether the rest of the system felt reliable. Small errors there propagated into picking mistakes very quickly.\n\nAnother lesson was that cached transforms and environment assumptions can help or hurt depending on how disciplined the setup is. In a fixed workspace, caching saves time and reduces repeated computation. But if the camera shifts or the workspace drifts and the cache is treated as truth, the system quietly degrades. That makes validation routines just as important as the calibration logic itself.\n\nWhat I took away from this project is that end-to-end robotics reliability comes from integration discipline. Vision accuracy alone is not enough. The actual product question is whether detection, geometry, and actuation stay coherent together under real operating conditions."
  },
  {
    "frontmatter": {
      "title": "How TTC Pulse works: from delay logs to route scores",
      "slug": "how-ttc-pulse-works",
      "date": "2026-10-25",
      "excerpt": "How TTC Pulse turns 1.1 million TTC delay events into route scores, where the score fails on small samples, and how the public dashboard is served for $0 a month.",
      "tags": [
        "Data Engineering",
        "MLOps",
        "Research Notes"
      ],
      "status": "draft"
    },
    "content": "## Problem\n\nThe TTC publishes delay logs for bus, subway and streetcar. Route labels in the logs are free text. They do not join to the TTC schedule as they are. TTC Pulse cleans these files, joins them to the GTFS schedule, and ranks each route and station with one reliability score.\n\n## Data\n\nTTC Pulse uses three sources:\n\n- **Delay logs.** TTC Bus, Subway and Streetcar Delay Data from City of Toronto Open Data (Open Government Licence, Toronto). The data has 1,111,831 delay events from 1 January 2014 to 31 January 2026: bus 723,518, subway 235,397, streetcar 152,916.\n- **GTFS schedule.** The TTC routes, stops and services. The route dimension has 229 routes (`dimensions/dim_route_gtfs.parquet`).\n- **GTFS-Realtime alerts.** One alert build on 16 April 2026 gave 37 alerts and 5,984 entity rows. 99.5% of the entity rows match a GTFS route.\n\nThe delay logs record delay events only. They do not record the trips that ran on time. Thus every count in TTC Pulse is a count, not a rate.\n\n## Architecture\n\n```pipeline\n{\"title\": \"Data flow in TTC Pulse\", \"steps\": [\"Sources\", \"Bronze\", \"Silver\", \"Gold marts\", \"JSON export\", \"Site build\", \"Dashboard\"]}\n```\n\n- **Bronze** keeps each source row as it arrived. Each row has `source_file`, `source_row_id` and `row_hash` (`src/ttc_pulse/bronze/build_bronze_tables.py`). All 1,111,831 delay events keep these fields, so each one traces back to its file and row.\n- **Silver** normalizes dates, routes, stations and causes into one fact table (`silver/fact_delay_events_norm.parquet`).\n- **Gold** has 8 marts in 22.0 MB of Parquet. The largest are `gold_delay_events_core` (1,086,378 rows), `gold_route_time_metrics` (893,537 rows) and `gold_station_time_metrics` (223,480 rows).\n- **Export.** A script in the TTC Pulse repo (`scripts/export_site_data.py`) reads the gold marts and writes small JSON files.\n- **Site build.** The site runs Next.js 15 on Cloudflare Workers through OpenNext. The dashboard imports the JSON files at build time. The page does not query a database.\n\n## Method\n\n### Route matching\n\nThe bus normalizer puts each route label into one of three tiers (`src/ttc_pulse/normalization/normalize_bus.py:94-104`):\n\n1. **Exact.** The full label is a route number, for example `32`. Confidence 1.0.\n2. **Token.** The label starts with a route number, or contains `LINE n`. Confidence 0.95 to 0.70.\n3. **Fallback.** The label has no route number. Confidence 0.0.\n\nThen the normalizer joins the route number to the GTFS route list. A route number with no GTFS route gets `link_status = unmatched_review` and a confidence of 0.35 or less (`normalize_bus.py:159-174`).\n\nAcross all modes, 95.8% of delay events (1,065,527) match by the exact tier and 4.2% (46,304) by the token tier. The committed fact table has no fallback rows. For bus, 97.7% of delay events (706,725 of 723,518) match a GTFS route. The other 16,793 (2.3%) are `unmatched_review`.\n\n### Reliability score\n\nI wrote the first version of the score in `src/ttc_pulse/marts/scoring.py:14-17` and `:74-79`:\n\n```\nscore = 0.35 z(frequency) + 0.30 z(severity_p90) + 0.20 z(regularity_p90) + 0.15 cause_mix\n```\n\n- **Frequency** is the number of delay events.\n- **Severity** is the 90th percentile of delay minutes (`build_gold_route_metrics.py:65-67`).\n- **Regularity** is the 90th percentile of gap minutes between vehicles.\n- **Cause mix** is 1 minus the sum of squared cause shares (`build_gold_route_metrics.py:88`). This is a diversity index, not a z-score (`scoring.py:72`).\n\nIn the route mart, each z-score compares a route with the other routes of the same mode, service date and hour (`build_gold_route_metrics.py:26`). In the ranking mart, each z-score compares an entity inside one ranking date, mode and entity type (`build_gold_rankings.py:32`). The ranking window is the 90 days to 31 January 2026 (`build_gold_rankings.py:77`).\n\n`scripts/check_readme_numbers.py` recomputes the stored score from its four inputs for all 893,537 route rows. The largest difference is 2.2e-16.\n\n## A check on the score\n\nThe score has a small-sample fault. In `gold_top_offender_ranking` for bus routes, route 28 Bayview South ranks 1st with 10 delay events. Route 32 Eglinton West has the most delay events (447) and ranks 9th.\n\n```chart\n{\"title\": \"Delay events in the 90-day window, raw top 10 bus routes\", \"unit\": \"events\", \"data\": [{\"label\": \"1. 28 Bayview South\", \"value\": 10}, {\"label\": \"2. 162 Lawrence-Donway\", \"value\": 34}, {\"label\": \"3. 87 Cosburn\", \"value\": 26}, {\"label\": \"4. 55 Warren Park\", \"value\": 33}, {\"label\": \"5. 127 Davenport\", \"value\": 53}, {\"label\": \"6. 115 Silver Hills\", \"value\": 9}, {\"label\": \"7. 33 Forest Hill\", \"value\": 21}, {\"label\": \"8. 184 Ancaster Park\", \"value\": 2}, {\"label\": \"9. 32 Eglinton West\", \"value\": 447}, {\"label\": \"10. 52 Lawrence West\", \"value\": 388}], \"caption\": \"Source: gold/gold_top_offender_ranking.parquet, bus routes, ranking date 31 January 2026.\"}\n```\n\n8 of the top 10 have fewer than 60 delay events. Their `severity_p90` is 287 to 471 minutes. With few delay events, one long delay sets the 90th percentile. The pipeline sets bus delays of 999 minutes or more to null (`_gold_utils.py:214`), but values below 999 stay.\n\nOn the site I added an adjusted score as a prototype method:\n\n```\nadjusted = score × n / (n + k)\n```\n\nHere `n` is the number of delay events of the entity in the 90-day window. `k` is the median `n` for that mode and entity type (bus: 54). This is a simple credibility weight. It pulls a score with a small `n` toward the mean, which is 0 for a z-score. The limit: `k` is a rule of thumb. I did not fit it to the data.\n\n## One query and its result\n\nThis query computes the adjusted score from the ranking mart and adds the route names:\n\n```sql\nWITH r AS (\n  SELECT entity_id, frequency AS n, severity_p90, composite_score, rank_position\n  FROM read_parquet('gold/gold_top_offender_ranking.parquet')\n  WHERE mode = 'bus' AND entity_type = 'route'\n),\nk AS (SELECT median(n) AS k FROM r)\nSELECT r.entity_id, d.route_long_name, r.n, r.severity_p90,\n       round(r.composite_score, 2) AS score, r.rank_position AS raw_rank,\n       round(r.composite_score * r.n / (r.n + k.k), 2) AS adjusted,\n       rank() OVER (ORDER BY r.composite_score * r.n / (r.n + k.k) DESC) AS adj_rank\nFROM r, k\nLEFT JOIN read_parquet('dimensions/dim_route_gtfs.parquet') d\n  ON d.route_id = r.entity_id\nORDER BY adjusted DESC\nLIMIT 5;\n```\n\nResult (TTC Pulse commit `d5d2a02`):\n\n| Route | Name | n | severity_p90 | Score | Raw rank | Adjusted | Adjusted rank |\n|---|---|---:|---:|---:|---:|---:|---:|\n| 32 | Eglinton West | 447 | 22.6 | 1.35 | 9 | 1.20 | 1 |\n| 52 | Lawrence West | 388 | 27.0 | 1.15 | 10 | 1.01 | 2 |\n| 127 | Davenport | 53 | 300.0 | 1.68 | 5 | 0.83 | 3 |\n| 102 | Markham Rd | 330 | 30.0 | 0.94 | 12 | 0.81 | 4 |\n| 162 | Lawrence-Donway | 34 | 367.1 | 2.06 | 2 | 0.80 | 5 |\n\nThe two routes with the most delay events move to the top. Route 28, with 10 delay events, leaves the top 5.\n\n## Options and decision\n\nThe team built the first dashboard in Streamlit (`app/pages/`). For a public link, I compared two ways to serve it.\n\n| | Streamlit server on AWS | Static rebuild on the site |\n|---|---|---|\n| Monthly cost | A server that runs all the time | $0 on the existing Cloudflare site |\n| Link works when | The server is up | The site is up |\n| Data freshness | Can query the marts live | Fixed at the last export |\n| Interactive filters | All Streamlit pages | Only the views I rebuilt |\n| Work to keep | Server, updates, access | One export script and one build |\n\n**Decision:** a static rebuild on the existing Cloudflare site. The cost is $0 a month. The recruiter link never depends on a server. The cost of this decision is freshness, but the gold marts stop at 31 January 2026, so a live query adds no new data.\n\n## Failure modes\n\n- **The export is stale.** The page loads and shows the numbers from the last export. To fix it, run `scripts/export_site_data.py` again and rebuild the site.\n- **A route does not match GTFS.** The delay event gets `unmatched_review` and no `route_id_gtfs`. Route marts do not include it: `gold_route_time_metrics` has 0 rows with a NULL route. The 16,793 unmatched bus delay events stay in silver for review.\n- **The alert parser runs twice.** The parser is not idempotent. A second run appends the same alert rows again, so alert counts increase. A fix is a unique key on snapshot time, alert and entity.\n- **The site build fails.** If `npm run cf:build` fails, `cf:deploy` does not run. Cloudflare keeps the last deployed version live.\n\n## Limits and what I would change\n\n- The raw files and the DuckDB database are not committed. The full pipeline does not run from a clone. The committed Parquet layers can be queried from a clone.\n- 60 of 234 snapshot files do not match their recorded checksum.\n- The repo has no tests and no CI. I would add `check_readme_numbers.py` to CI first, because it already exits 0 on a correct build.\n- I have not run the `aws/` kit (S3, Glue, Athena) yet.\n- Newer cause rows use raw codes, for example `MFWEA`, that have no description in `dim_incident_code`.\n- Yonge Station has 2,343 of its 8,229 delay events at 22:00, with the top cause \"Miscellaneous Other\". This needs a check before anyone uses the station ranking.\n- To turn counts into rates, I would join the GTFS trip counts per route and hour.\n- I would fit `k` in the adjusted score from the data, and not use the median.\n\n## Team and credits\n\nTTC Pulse is a team project from a York University course (Data Analytics and Visualization, Winter 2026). The committers are Awais Aziz, Om Patel and Muhammad Asad. Om wrote the first versions of 33 of the 36 pipeline modules, including `src/ttc_pulse/marts/scoring.py` and `build_gold_rankings.py`. Awais Aziz built the AI chat page (`app/pages/08_AI_Chat_Bot.py`) and later changed much of the pipeline code. Muhammad Asad made the first import."
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
    "content": "When I started working on LLMs for optimization, the tempting framing was to ask whether a language model could solve Job Shop Scheduling directly. That turned out to be the wrong first question. The useful question was whether I could expose the structure of the optimization problem clearly enough for the model to reason over it.\n\nThe most important change I made was representing each instance as a disjunctive graph and then serializing the hard constraints explicitly. Once precedence rules and machine conflicts were visible in the input format, the model outputs became easier to inspect. They were still wrong in many cases, but they were wrong in more diagnosable ways.\n\n```pipeline\n{\"title\": \"Step through the JSSP pipeline\", \"steps\": [\"Raw JSSP instance\", \"Disjunctive graph (PyTorch Geometric)\", \"Serialized precedence + machine constraints\", \"4-bit LoRA fine-tune\", \"Schedule output + violation check\"]}\n```\n\nAnother practical lesson was that feasibility matters more than fluency. A schedule can sound coherent and still be invalid. I had to inspect violations systematically instead of treating natural-sounding output as a sign of progress. That forced me to track constraint failures, not just generic text quality.\n\nFine-tuning also became much more manageable after I reduced the runtime burden with 4-bit LoRA. That did not magically solve the core reasoning problem, but it let me iterate faster and test representation changes without turning every experiment into a multi-day wait.\n\n```chart\n{\"title\": \"Fine-tuning runtime (hover a bar)\", \"unit\": \"h\", \"ratioLabel\": \"faster iteration\", \"data\": [{\"label\": \"Initial setup\", \"value\": 70}, {\"label\": \"Filtered data + 4-bit LoRA\", \"value\": 11.5}], \"caption\": \"Run on a single NVIDIA RTX A6000 with Unsloth.\"}\n```\n\n```chart\n{\"title\": \"STARJOB instances before and after cleaning\", \"data\": [{\"label\": \"Raw instances (approx.)\", \"value\": 130000}, {\"label\": \"Usable instances\", \"value\": 9525}], \"caption\": \"Filtering noisy and malformed instances was a large part of the runtime win.\"}\n```\n\nThe biggest caveat is that optimization tasks punish vague prompting. If the structure is underspecified, the model fills gaps with plausible but infeasible decisions. My main takeaway is simple: for constrained optimization, representation design is the real work. The model only becomes useful after the structure is explicit enough to support valid reasoning."
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
    "content": "In the PMML project, I compared a probabilistic GLM-style baseline with a GRU sequence model for traffic anomaly detection. What I liked about this setup is that it exposed a familiar tradeoff: interpretability and stability versus expressive temporal modeling.\n\n```pipeline\n{\"title\": \"Two scoring paths compared\", \"steps\": [\"Toronto traffic counts\", \"Poisson GLM baseline\", \"GRU sequence model\", \"Divergence-based anomaly score\", \"Calibration review\"]}\n```\n\nThe GLM side gave me a cleaner picture of what the model believed normal traffic should look like. That made it easier to reason about spikes, count behavior, and feature influence. The GRU was better at absorbing temporal context, but it also made debugging harder because a strange anomaly score could come from a much deeper interaction of sequence dynamics.\n\nOne of the most important caveats was anomaly scoring itself. Divergence-style scores can look mathematically appealing while still being operationally noisy. In traffic streams, daily rhythms, local disruptions, and sensor irregularities can all create distribution shifts that are not equally meaningful. If I did not calibrate the thresholding carefully, the system could produce many alerts that were technically explainable but not useful.\n\nThis project reinforced a habit I want to keep: a stronger model is not automatically a better monitoring system. If an anomaly detector cannot be interpreted, calibrated, and trusted in context, it becomes hard to deploy responsibly. The useful evaluation question is not only \"which model wins?\" but also \"which model produces signals someone could act on without constant manual cleanup?\""
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
    "content": "One of the easiest mistakes in RAG systems is over-focusing on the generator. In my ChatPDF work, the faster gains came from retrieval quality, chunking discipline, and grounding checks rather than from changing the language model.\n\n```pipeline\n{\"title\": \"Where each ChatPDF answer comes from\", \"steps\": [\"Upload PDF\", \"LangChain chunking\", \"Embeddings\", \"FAISS index\", \"Top-k retrieval\", \"Agentic answer (OpenAI Agents SDK)\"]}\n```\n\nWhen answers were weak, the first thing I needed to know was whether the right evidence had even been retrieved. If the top chunks were wrong or incomplete, no downstream prompt was going to fix that consistently. That pushed me to inspect retrieval recall, chunk boundaries, and failure slices before doing any model-level tuning.\n\nI also learned that answer quality should be judged against support, not style. A polished answer that cites the wrong context is worse than a simpler answer that stays faithful to the document. That is especially important for PDF QA, where users often trust confident wording too easily.\n\nMy working rule now is straightforward: retrieval is the product backbone of a RAG system. If chunking, indexing, and evidence selection are weak, the rest of the stack becomes an expensive way to hide the real problem."
  }
] as const;
