# Coddle Learn — Agent & Product Context

> Setup and contributor quickstart live in [`README.md`](./README.md). This file is the product requirements, roadmap, and agent context for building Coddle Learn.

**Learn, Build, Share, Grow.**

An open-source interactive developer learning platform in the Coddle product family.

| | |
|---|---|
| **Status** | In development (Day 1) |
| **Type** | Open-source interactive developer learning platform |
| **Repository** | `coddle-learn` |
| **Audience** | Developers, aspiring developers, educators, mentors, and professional contributors |

---

## Product Overview

Coddle Learn helps people start, develop, and advance their careers in technology.

It combines structured learning roadmaps, courses, curated external resources, practical projects, assessments, credentials, community participation, and mentorship into one connected learning experience.

Instead of only consuming courses, users should be able to:

**Discover → Learn → Practice → Build → Prove → Share → Grow**

The platform is community-driven: developers, educators, mentors, and contributors create and improve learning content together.

---

## Problem

Developer education is highly fragmented. A beginner trying to become a frontend developer may bounce between YouTube, documentation, blogs, courses, GitHub, roadmap sites, coding challenges, Discord, mentors, and project tutorials.

The problem is not a lack of resources. The problem is knowing:

- What to learn
- In what order
- How to practice
- Whether you've actually learned it
- How to demonstrate that knowledge

Coddle Learn connects these pieces.

---

## Vision

Build open-source learning infrastructure where anyone can learn technology, build real things, demonstrate their skills, and grow with a community.

---

## Goals

### Primary

- Help beginners navigate their learning journey
- Provide structured technology roadmaps
- Provide high-quality learning resources
- Encourage learning through practical projects
- Allow users to demonstrate knowledge through assessments
- Provide free verifiable credentials
- Connect learners with experienced developers
- Enable developers to contribute educational content
- Build an active open-source developer community
- Remain useful beyond a developer's beginner stage

### Secondary

- Help developers discover new technologies
- Help experienced developers deepen existing skills
- Create opportunities for mentors and educators
- Build a public developer learning profile
- Eventually connect learning achievements with career opportunities

### Non-Goals (initial)

Coddle Learn should **not** initially become:

- A general university replacement
- A generic social network
- A job marketplace
- A Udemy clone
- A video hosting platform
- A cryptocurrency/certificate marketplace
- A platform that hosts every piece of educational content itself

External resources remain an important part of the platform.

---

## Target Users

| Persona | Needs |
|---|---|
| **Beginners** | Where to start, what order, where to learn, what to build, how to know you're ready |
| **Intermediate** | Level up (e.g. React → Next.js, frontend → backend, Node → Go, system design, cloud) |
| **Senior** | Advanced roadmaps, architecture, system design, leadership, code review, specialized paths |
| **Contributors** | Create courses/roadmaps/resources/challenges/tutorials; review content; contribute code |
| **Mentors** | Mentor learners, host sessions, review projects, answer questions, create content |

---

## Core Product Loop

```
Discover
   ↓
Choose Roadmap
   ↓
Learn
   ↓
Practice
   ↓
Build
   ↓
Assessment
   ↓
Credential
   ↓
Share
   ↓
Community
   ↓
Continue Learning
```

---

## Suggested Technology Stack

| Layer | Choice |
|---|---|
| **Frontend** | Next.js + TypeScript + Tailwind CSS |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | PostgreSQL (highly relational model) |
| **Cache** | Redis (where necessary) |
| **Storage** | S3-compatible object storage |
| **Search** | PostgreSQL first; Elasticsearch/OpenSearch later if needed |
| **Infrastructure** | Docker + GitHub Actions |
| **Monorepo** | pnpm workspaces + Turborepo |

### Why PostgreSQL

The data model is highly relational: users, courses, lessons, roadmaps, skills, resources, projects, assessments, credentials, contributions, mentorships, and community.

---

## Repository Structure

```
coddle-learn/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Node.js + Express + TypeScript API
├── packages/         # Shared packages (as needed)
├── docs/             # Architecture & API docs
├── .github/
│   ├── workflows/
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── LICENSE
└── README.md
```

---

## Core Database Entities

Initial entities:

`User` · `Profile` · `Skill` · `Roadmap` · `RoadmapNode` · `Course` · `CourseModule` · `Lesson` · `Resource` · `Project` · `Assessment` · `Question` · `Submission` · `Credential` · `Badge` · `CommunityPost` · `Comment` · `MentorProfile` · `MentorshipRequest` · `Contributor` · `Notification` · `Report`

---

## Core Features

### Authentication

Sign up, login, logout, password reset, email verification, Google/GitHub OAuth, profile management.

**Future:** passkeys, GitHub identity verification.

### User Profile

Public learning profile with bio, skills, learning paths, progress, projects, credentials, contributions, badges, and community activity.

### Roadmaps

Primary navigation for learning paths. Each node can include description, prerequisites, resources, courses, docs, articles, videos, projects, challenges, and assessments.

Users can start roadmaps, track progress, complete/skip nodes, save resources, resume learning, and view completion percentage.

### Courses

Contributor-created courses:

```
Course
 ├── Module
 │    ├── Lesson
 │    ├── Resource
 │    ├── Quiz
 │    └── Exercise
 ├── Module
 └── Final Assessment
```

Features: text lessons, video links, external resources, code examples, quizzes, exercises, projects, progress tracking, completion status.

### External Resources

Contributors submit resources from official docs, GitHub, YouTube, MDN, FreeCodeCamp, universities, blogs, and other trusted platforms.

Each resource: title, description, URL, type, difficulty, technology, contributor, verification status.

### Resource Verification

```
Pending → Under Review → Approved → Published
```

Community can report broken links, outdated info, incorrect content, and poor-quality resources.

### Interactive Learning

Quizzes, flashcards, coding challenges, MCQs, fill-in-the-blank, knowledge checks, interactive exercises.

**Future:** browser-based coding environments, automated evaluation, AI tutoring.

### Projects & Showcase

Every major path leads to practical work (beginner → intermediate → advanced). Users publish projects with name, description, screenshots, GitHub repo, live URL, technologies, related roadmap/course, challenges faced, and what they learned.

### Assessments & Credentials

Assessment types: multiple choice, true/false, short answer, coding challenges, project assessments.

Credentials are free, verifiable, and tied to real achievements (skills, projects, assessments), with public verification URLs.

### Badges

Smaller achievements: first course, first project, streaks, open-source contributor, roadmap completed, mentor, course creator, resource reviewer.

### Community

Ask/answer questions, comment, discuss courses and roadmaps, share projects, follow developers, like/bookmark content.

### Mentorship

Mentor profiles (expertise, technologies, experience, availability, topics). Requests for code review, career guidance, project feedback, technical guidance, learning advice.

Premium mentorship may support monetization later.

### Contributor System

Submit content (courses, lessons, roadmaps, resources, projects, challenges, tutorials) and code (features, bug fixes, UI, docs, tests). Contributor profiles track impact.

### Moderation, Search, Notifications, Dashboard

- **Admin:** review/approve/reject content, suspend contributors, remove inappropriate content, mark outdated resources
- **Search:** courses, roadmaps, resources, projects, developers, mentors, technologies
- **Notifications:** course/roadmap updates, replies, mentor requests, project feedback, achievements, recommendations
- **Dashboard:** continue learning, roadmap progress, daily goals, projects, credentials, community activity

### Skill Graph (distinctive)

Track skill relationships (e.g. JavaScript → TypeScript → React → Next.js → Frontend Engineering) from completed learning, assessments, projects, and credentials — not just “completed React course.”

### AI Learning Assistant (later)

Explain concepts, answer questions, generate practice, recommend resources, analyze progress, suggest next steps, explain incorrect answers, personalize paths. Augments content; does not replace it.

### Premium (hosted Coddle service)

Core learning stays free/open source. Potential premium: AI assistant, advanced assessments, premium courses, mentor sessions, analytics, private environments, org/team dashboards, managed hosting, enterprise support.

Do **not** artificially paywall the basic ability to learn.

---

## MVP Scope

At the end of the first 30 days, support this loop:

```
              Coddle Learn
                   │
      ┌────────────┼────────────┐
      ↓            ↓            ↓
   Roadmaps      Courses      Resources
      │            │            │
      └────────────┼────────────┘
                   ↓
                Learning
                   ↓
               Assessments
                   ↓
                Projects
                   ↓
               Credentials
                   ↓
                Community
                   ↓
              Contributions
```

### Deliberately postpone

AI tutor · advanced mentorship marketplace · employer marketplace · mobile app · payments · premium subscriptions · advanced analytics · browser IDE · complex recommendations · enterprise features

Validate the core learning loop first.

---

## 30-Day Build Timeline

| Day | Focus |
|---|---|
| 1 | Foundation: monorepo, Next.js, Express/TS API, PostgreSQL, Docker, env config + landing page |
| 2 | Architecture: API structure, DB connection, frontend structure, conventions, errors |
| 3 | Auth: registration, login, logout, password hashing, email verification foundation |
| 4 | Profiles: profile, avatar, bio, skills, public profile |
| 5 | Core models: users, skills, courses, roadmaps, resources, lessons, projects |
| 6 | Admin foundation: admin auth, dashboard, user management |
| 7 | Course creation: courses, modules, lessons |
| 8 | Course experience: course/lesson pages, progress, completion |
| 9 | Resources: external resources, categories, links, difficulty, technologies |
| 10 | Resource discovery: listing, search, filters, bookmarking |
| 11 | Roadmap engine: creation, nodes, relationships, visualization |
| 12 | Interactive roadmaps: start, complete nodes, progress %, continue learning |
| 13 | Roadmap content: connect nodes to courses, lessons, resources, projects |
| 14 | Learning dashboard: current courses, roadmap progress, continue learning, activity |
| 15 | Quiz engine: questions, MCQ, submission, scoring |
| 16 | Assessments: course assessments, passing requirements, history |
| 17 | Projects: catalog, details, requirements, submission |
| 18 | Project showcase: publish, GitHub/live URLs, screenshots, technologies |
| 19 | Credentials: generation, IDs, public verification page |
| 20 | Badges: definitions, achievement engine, user badges |
| 21 | Community: posts, comments, questions, answers |
| 22 | Community profiles: follow, activity, contributions, projects, progress |
| 23 | Contributors: profiles, submissions, status, review workflow |
| 24 | Moderation: pending → review → approved → published + reporting |
| 25 | Notifications: community, course updates, achievements, contributors |
| 26 | Global search: courses, roadmaps, resources, projects, users |
| 27 | Open-source infra: CONTRIBUTING, CoC, SECURITY, issue/PR templates, docs |
| 28 | Testing & quality: unit, API, integration, frontend, validation, security |
| 29 | Deployment: web, API, DB, storage, CI/CD, monitoring, error tracking |
| 30 | Public launch: repo, docs, site, contribution guide, initial content, announce |

---

## Success Metrics

Don't measure only registered users.

| Area | Examples |
|---|---|
| **Learning** | Courses/roadmaps started & completed, lessons completed, assessments passed |
| **Building** | Projects created, submitted, completed |
| **Community** | Questions asked/answered, contributions, PRs, reviews, mentorship sessions |
| **Open source** | Contributors, PRs, issues resolved, forks, stars, external integrations |
| **Impact** | How many people actually progressed because of Coddle Learn? |

---

## Open Source Requirements

The project should include:

- Clear contribution guidelines
- Development setup
- Architecture documentation
- API documentation
- Issue and PR templates
- Automated testing
- CI/CD
- Release process
- Code standards

---

## Getting Started

See [`README.md`](./README.md) for install, scripts, and local URLs.

---

## License

TBD — open source (license to be chosen during project foundation).

---

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md).

A code of conduct, security policy, and issue/PR templates are still planned.

---

**Coddle Learn** — *Learn, Build, Share, Grow.*
)

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
