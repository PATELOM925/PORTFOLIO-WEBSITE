import Image from "next/image";
import Link from "next/link";
import { BlogCard } from "@/components/BlogCard";
import { ContactForm } from "@/components/ContactForm";
import { Layout } from "@/components/Layout";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";
import { RecruiterAssistant } from "@/components/RecruiterAssistant";
import { Section } from "@/components/Section";
import { TimelineItem } from "@/components/TimelineItem";
import {
  certifications,
  education,
  extracurriculars,
  industryExperience,
  researchEntries,
  siteConfig,
  skills,
  socialLinks
} from "@/config/site";
import { getAllProjects, getFeaturedProjects, getLatestBlogPosts } from "@/lib/content";

export default async function HomePage() {
  const [featuredProjects, allProjects, latestPosts] = await Promise.all([
    getFeaturedProjects(),
    getAllProjects(),
    getLatestBlogPosts(4)
  ]);

  return (
    <Layout>
      <div className="container">
        <section className="hero animate-rise" id="about">
          <div className="hero-copy">
            <p className="eyebrow">{siteConfig.location}</p>
            <div className="hero-title-wrap">
              <Image src={siteConfig.logoPath} alt="Om Patel logo" width={56} height={56} />
              <h1>{siteConfig.name}</h1>
            </div>
            <p className="lead">
              <span>{siteConfig.role}</span>
              <span className="lead-separator" aria-hidden="true">•</span>
              <span>{siteConfig.focus}</span>
            </p>
            <div className="hero-cta">
              <a href="/go/resume" className="btn btn-primary" target="_blank" rel="noreferrer">
                Download Resume
              </a>
              <a href={`mailto:${siteConfig.email}`} className="btn btn-secondary">
                Contact Me
              </a>
              <Link href="/projects" className="btn btn-secondary">
                View Projects
              </Link>
            </div>
            <div className="social-row">
              {socialLinks.map((item) => (
                <a key={item.href} href={item.href} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div className="hero-image-wrap">
            <Image
              src={siteConfig.profileImage}
              alt="Portrait of Om Patel"
              width={580}
              height={580}
              priority
              className="hero-image"
            />
          </div>
        </section>

        <section className="cta-strip animate-rise">
          <p>{siteConfig.description} Available for full-time applied AI, AI/ML, NLP, and data engineering roles in Canada.</p>
        </section>

        <Section id="experience" title="Industry Experience">
          <div className="timeline-grid">
            {industryExperience.map((item) => (
              <TimelineItem
                key={item.title + item.period}
                title={item.title}
                meta={item.organization}
                period={item.period}
                bullets={item.bullets}
              />
            ))}
          </div>
        </Section>

        <Section id="education" title="Education">
          <div className="timeline-grid">
            {education.map((item) => (
              <article key={item.degree} className="timeline-item">
                <div className="timeline-top">
                  <h3>{item.degree}</h3>
                  <p>{item.school}</p>
                </div>
                <p className="timeline-period">{item.period}</p>
                <p>
                  <strong>GPA:</strong> {item.gpa}
                </p>
                <p>
                  <strong>Relevant coursework:</strong> {item.relevantCoursework}
                </p>
              </article>
            ))}
          </div>
        </Section>

        <Section id="research" title="Research & Publications">
          <div className="timeline-grid">
            {researchEntries.map((item) => (
              <article key={item.slug} className="timeline-item">
                <div className="timeline-top">
                  <h3>{item.title}</h3>
                  <p>{item.role}</p>
                </div>
                <p className="timeline-period">{item.period}</p>
                <ul>
                  {item.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <div className="project-links">
                  {item.codeUrl ? (
                    <a href={`/go/research/${item.slug}/code`} target="_blank" rel="noreferrer">
                      Code
                    </a>
                  ) : null}
                  {item.publicationUrl ? (
                    <a href={`/go/research/${item.slug}/publication`} target="_blank" rel="noreferrer">
                      Publication
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </Section>

        <Section id="projects" title="Featured Projects">
          <FeaturedCarousel
            projects={featuredProjects.slice(0, 4).map((project) => project.frontmatter)}
            totalCount={allProjects.length}
          />
        </Section>

        <Section id="skills" title="Skills">
          <div className="skills-grid">
            {skills.map((skill) => (
              <article key={skill.category} className="card skill-card">
                <h3>{skill.category}</h3>
                <p>{skill.items}</p>
              </article>
            ))}
          </div>
        </Section>

        <Section id="blog" title="Blog">
          <div className="card-grid">
            {latestPosts.map((post) => (
              <BlogCard key={post.frontmatter.slug} post={post.frontmatter} />
            ))}
          </div>
          <div className="inline-actions">
            <Link href="/blog" className="text-link">
              Read more insights
            </Link>
          </div>
        </Section>

        <Section id="fit-check" title="Role Fit Check" subtitle="Hiring for a role? Paste the job description to get an evidence-based summary of how Om matches it, plus suggested interview questions.">
          <RecruiterAssistant />
        </Section>

        <Section id="certifications" title="Certifications">
          <div className="card simple-list list-card">
            {certifications.map((item) => (
              <p key={item.label}>
                <a href={item.url} target="_blank" rel="noreferrer" className="text-link">
                  {item.label}
                </a>
              </p>
            ))}
          </div>
        </Section>

        <Section id="extracurricular" title="Extracurriculars">
          <div className="card simple-list list-card">
            {extracurriculars.map((item) => (
              <p key={item.label}>
                {item.label}
                {item.period ? ` (${item.period})` : ""}
              </p>
            ))}
          </div>
        </Section>

        <Section id="contact" title="Contact">
          <div className="card form-card">
            <p className="contact-details">
              <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
              <span aria-hidden="true"> • </span>
              <a href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}>{siteConfig.phone}</a>
            </p>
            <ContactForm formspreeId={siteConfig.formspreeId} />
          </div>
        </Section>
      </div>
    </Layout>
  );
}
