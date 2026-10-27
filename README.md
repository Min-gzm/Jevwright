# Jevwright
an AI-assisted web testing platform built on Jev and Playwright. It is a testing framework that is cheaper and faster to run than LLM-driven alternatives. It serves as the primary reference for product development, testing, and acceptance.

## Getting started

Requirements: Node.js 22+ and pnpm (`npm install -g pnpm`).

```bash
git clone https://github.com/yike2/Jevwright.git
cd Jevwright
pnpm install
```

`pnpm install` also sets up the git commit template, the commit-msg hook, and nano (wrapping at 72 chars) as the commit editor (see below). These settings apply to this repository only.

## Commit messages

Every commit message must follow this structure:

```
<title>

<description>

Close #<issue number>
```

- **Title**: one line summarizing the change.
- **Description**: what changed and why. Required.
- **Close #N**: optional. Add it when the commit resolves a GitHub issue; the issue closes automatically when the commit reaches `main`.

Example:

```
Add login page

Adds the email/password form and redirects to the dashboard on success.

Close #12
```

### How it works

- `git commit` (without `-m`) opens the template [`.gitmessage`](.gitmessage) in your editor. Lines starting with `#` are hints and are removed automatically.
- The hook [`.githooks/commit-msg`](.githooks/commit-msg) checks every commit, including `git commit -m`. If the title, the blank second line, or the description is missing, the commit is rejected with a message explaining why. Merge and revert commits are skipped.

### Manual setup

If you cloned without running `pnpm install`, or the hook isn't working, run this in the repository root:

```bash
git config core.hooksPath .githooks
git config commit.template .gitmessage
git config core.editor "nano --breaklonglines --fill=72"
```

Check that it's set:

```bash
git config --get core.hooksPath    # .githooks
git config --get commit.template   # .gitmessage
```
