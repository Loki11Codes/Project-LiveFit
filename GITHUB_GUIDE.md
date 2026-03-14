# LiveFit Collaborative GitHub Guide

Welcome to the team! To ensure a smooth development process for both of you, we've implemented a professional GitHub workflow.

## 1. Branching Strategy

- **`main`**: The stable branch. Use this for production-ready code. Never commit directly to `main` unless it's a critical, small fix.
- **Feature Branches**: Create a new branch for every task.
  - Pattern: `feature/short-description` or `bugfix/issue-id-description`.
  - Example: `git checkout -b feature/user-profile-styles`

## 2. Using Templates

We've added templates to help standardise our communication:
- **Issue Templates**: When you find a bug or have a feature idea, use the "New Issue" button on GitHub. It will prompt you to use our pre-defined structures.
- **Pull Request Template**: When you're ready to merge code, creating a PR will automatically populate a checklist. Fill it out to help your partner review!

## 3. The PR Process

1. **Commit and Push**: Push your feature branch to GitHub.
2. **Open a PR**: Open a Pull Request from your branch into `main`.
3. **Automated Checks**: The GitHub Action (CI) will automatically start. It checks if the project builds and if there are any linting errors.
4. **Peer Review**: The other developer should review the code, leave comments, and eventually "Approve".
5. **Merge**: Once checks pass and you have an approval, merge into `main`.

## 4. Recommended Repository Settings (Admin Actions)

> [!IMPORTANT]
> The repository owner should perform these manual steps on the GitHub website:

1. Go to **Settings > Branches**.
2. Click **Add branch protection rule**.
3. **Branch name pattern**: `main`.
4. Check **Require a pull request before merging**.
5. Check **Require status checks to pass before merging** (search for `build_and_lint` once the first CI runs).
6. Click **Create**.

Happy Coding!
