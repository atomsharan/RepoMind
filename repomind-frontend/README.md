# RepoMind Frontend MVP

RepoMind is an Agentic Project Intelligence and Engineering Knowledge Continuity Platform. This frontend MVP is built for a 36-hour hackathon, focusing on premium design, clear product storytelling, and easy integration with a Django backend.

## Tech Stack

- **React 19**
- **TypeScript**
- **Vite 8**
- **Tailwind CSS 4**
- **Lucide React Icons**
- **Framer Motion** (for animations)
- **React Router 7**
- **Axios** (for API communication)

## Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Locally:**
   ```bash
   npm run dev
   ```

3. **Build for Production:**
   ```bash
   npm run build
   ```

## Backend Integration

The application is connected to the Django REST Framework backend by default.

- All API logic is centralized in `src/services/api.ts`.
- Set `VITE_USE_MOCK_DATA=true` only when you want to run the UI without the backend.
- The base URL is configured via `VITE_API_BASE_URL` (defaults to `http://localhost:8000/api`).
- The Django backend must be running on port `8000` unless you change `VITE_API_BASE_URL`.

## Project Structure

- `src/components/`: Reusable UI components and dashboard sections.
- `src/pages/`: Main application pages (Landing, Loading, Dashboard).
- `src/services/`: API communication layer.
- `src/types/`: TypeScript interfaces defining the data models.
- `src/data/`: Mock data for the demo mode.

## Features

- **Landing Page:** Professional hero section with repository URL input.
- **Analysis Animation:** A realistic "investigation" sequence that illustrates the agentic nature of RepoMind.
- **Project Dashboard:**
  - **Overview:** High-level metrics and project summary.
  - **Architecture:** Reconstructed component mapping and technology stack.
  - **Project Memory:** Historical context and engineering decisions timeline.
  - **Risks:** Evidence-backed technical risks with potential impact and recommendations.
  - **Continuity Plan:** Prioritized roadmap for engineers joining or continuing the project.
  - **Ask RepoMind:** grounded Q&A interface for deep repository inquiries.
