export type PublishStatus = "published" | "draft";

export interface ProjectFrontmatter {
  title: string;
  slug: string;
  date: string;
  preview: string;
  tags: string[];
  status: PublishStatus;
  github?: string;
  demoUrl?: string;
  youtubeUrl?: string;
  reportUrl?: string;
  publicationUrl?: string;
  featured: boolean;
  isPrivateSource?: boolean;
  problem?: string;
  approach?: string;
  result?: string;
  thumbnail?: string;
}

export interface BlogFrontmatter {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  tags: string[];
  status: PublishStatus;
}

export interface ContentRecord<T> {
  frontmatter: T;
  content: string;
}

export interface SkillGroup {
  category: string;
  items: string;
}

export interface ResearchEntry {
  slug: string;
  title: string;
  role: string;
  period: string;
  bullets: string[];
  codeUrl?: string;
  publicationUrl?: string;
  slidesUrl?: string;
  reportUrl?: string;
}

export interface ExperienceEntry {
  title: string;
  organization: string;
  period: string;
  bullets: string[];
}

export interface CredentialEntry {
  label: string;
  url: string;
}

export interface ExtracurricularEntry {
  label: string;
  period?: string;
}

export interface EducationEntry {
  degree: string;
  school: string;
  period: string;
  gpa: string;
  relevantCoursework: string;
}
