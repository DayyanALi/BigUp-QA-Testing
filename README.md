# BigUp QA Engineer Project - Automation Suite

This repository contains a Playwright-based End-to-End (E2E) automation suite for the BigUp web application. The suite covers 6 core user flows including Predictions, Chat, AI interactions, and Stream Replay.

## Directory Structure

```text
├── .github/workflows/       # CI/CD Pipeline (GitHub Actions)
├── tests/
│   ├── pages/               # Page Object Models (POM)
│   │   ├── BasePage.ts      # Common utilities
│   │   ├── HomePage.ts      # Feed & Discovery
│   │   ├── ActivityPage.ts  # Game-specific predictions
│   │   ├── ChatPage.ts      # Community & Stream Chat
│   │   ├── BiggiePage.ts    # AI Hub interactions
│   │   ├── StreamPage.ts    # Replay controls
│   │   └── QuestsPage.ts    # Reward verification
│   ├── biggie.spec.ts       # AI Hub test suite
│   ├── chat.spec.ts         # Community messaging tests
│   ├── stream.spec.ts       # Video playback tests
│   ├── predictions.spec.ts  # Home & Activity prediction tests
│   ├── quests.spec.ts       # Quest status tests
│   └── e2e-user-journey.spec.ts # Combined cross-feature journeys
├── playwright.config.ts     # Global configuration
├── config.json              # Authentication state (Session Cookies)
└── package.json             # Project dependencies
```

## Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd BigUp
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Install Playwright Browsers:**
    ```bash
    npx playwright install --with-deps
    ```

## Running Tests

### Locally (Headless)
To run the entire suite in the background:
```bash
npx playwright test
```

### Local UI Mode
To run tests with the interactive UI:
```bash
npx playwright test --ui
```

### Run Specific Modules
```bash
npx playwright test tests/predictions.spec.ts
npx playwright test tests/stream.spec.ts
```

## CI/CD Pipeline
The project uses **GitHub Actions** to automatically execute the test suite on every push and pull request to the `main` or `master` branches.

- **Pipeline Config:** `.github/workflows/playwright.yml`
- **Actions Tab:** [View Pipeline Runs](<LINK_TO_BE_ADDED_BY_USER>)

## Technical Decisions
- **Page Object Model (POM):** Decoupled UI logic from test scripts for maximum maintainability.
- **Resilient Locators:** Prioritized `getByRole`, `getByText`, and semantic wildcards over brittle CSS classes/XPaths.
- **State Persistence:** Utilizes a global `storageState` (`config.json`) to bypass repetitive login flows.
- **Video Interaction:** Used a combination of Playwright locators and direct DOM `evaluate()` calls to verify HTML5 media states reliably.
