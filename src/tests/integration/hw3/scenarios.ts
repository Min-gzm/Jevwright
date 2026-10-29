import type { Page } from "playwright";

// One captured page state. `capture.ts` turns each scenario into
// fixtures/<name>/{screenshot.png, snapshot.json, expected.json}.
export type Scenario = {
  name: string;
  description: string;
  path: string;
  setup?: (page: Page) => Promise<void>;
  // `target` is written the way a test author writes a Step's `target`.
  // `selector` is the ground truth; null means the element is not on the page.
  targets: { target: string; selector: string | null; note?: string }[];
  statements: { statement: string; holds: boolean; note?: string }[];
};

export const scenarios: Scenario[] = [
  {
    name: "login-empty",
    description: "Login page before the user types anything",
    path: "/login.html",
    targets: [
      { target: "Email input field", selector: "#email" },
      { target: "Password input field", selector: "#password" },
      { target: "Blue 'Sign in' button", selector: "button[type=submit]" },
      { target: "Eye icon button that shows the password", selector: "#toggle-password", note: "Icon only; DOM name comes from aria-label" },
      { target: "'Remember me' checkbox", selector: "#remember" },
      { target: "'Sign in with Google' button", selector: null },
    ],
    statements: [
      { statement: "A sign-in form with email and password fields is shown", holds: true },
      { statement: "An error message is shown", holds: false },
      { statement: "The user is signed in", holds: false },
    ],
  },
  {
    name: "login-error",
    description: "Login page after submitting a wrong password",
    path: "/login.html",
    setup: async (page) => {
      await page.fill("#email", "demo@example.com");
      await page.fill("#password", "wrong-password");
      await page.click("button[type=submit]");
    },
    targets: [
      { target: "Red error message about the incorrect email or password", selector: "#login-error", note: "Not interactive, so it is absent from snapshot.elements" },
      { target: "'Sign in' button", selector: "button[type=submit]" },
      { target: "'Forgot password?' link", selector: "#forgot-password" },
    ],
    statements: [
      { statement: "An error message says the email or password is incorrect", holds: true },
      { statement: "The email field is highlighted as invalid", holds: true, note: "Visual only: red border" },
      { statement: "The user has reached the task board", holds: false },
    ],
  },
  {
    name: "board-default",
    description: "Task board of the 'Website redesign' project",
    path: "/board.html",
    targets: [
      { target: "'New task' button", selector: "#new-task" },
      { target: "Search tasks input in the top bar", selector: "#search" },
      { target: "Bell icon for notifications", selector: "#notifications" },
      { target: "Gear icon that opens settings", selector: "#settings-link" },
      {
        target: "Delete (trash) icon in the 'Write release notes' row",
        selector: "tr[data-task-id=t3] [data-action=delete]",
        note: "Ambiguous: six identical 'Delete task' buttons; only the row text tells them apart",
      },
      {
        target: "Checkbox for the 'Design new pricing page' task",
        selector: "tr[data-task-id=t2] input[type=checkbox]",
        note: "Ambiguous: six identical 'Mark as done' checkboxes",
      },
      { target: "'Done' tab", selector: "[role=tab][data-filter=done]" },
      { target: "'Mobile app' project in the sidebar", selector: ".sidebar a:has-text('Mobile app')" },
      { target: "'Export to CSV' button", selector: null },
    ],
    statements: [
      { statement: "The task list shows 6 tasks", holds: true },
      { statement: "The 'Write release notes' task is assigned to Priya Shah", holds: true },
      { statement: "Two tasks are marked as done", holds: true },
      { statement: "The notification bell shows 5 unread notifications", holds: false, note: "It shows 3" },
    ],
  },
  {
    name: "board-new-task-dialog",
    description: "Task board with the 'New task' modal dialog open",
    path: "/board.html",
    setup: async (page) => {
      await page.click("#new-task");
    },
    targets: [
      { target: "Title input in the New task dialog", selector: "#task-title" },
      { target: "Assignee dropdown", selector: "#task-assignee" },
      { target: "'High' priority radio button", selector: "input[name=priority][value=high]" },
      { target: "'Create task' button", selector: "#task-create" },
      { target: "'Cancel' button in the dialog", selector: "#task-cancel" },
      { target: "'New task' button behind the dialog", selector: "#new-task", note: "Covered by the modal backdrop: hittable is false" },
    ],
    statements: [
      { statement: "A dialog for creating a new task is open", holds: true },
      { statement: "Medium priority is selected", holds: true },
      { statement: "The dialog has a field for choosing a project", holds: false },
    ],
  },
  {
    name: "board-delete-confirm",
    description: "Confirmation dialog after clicking delete on 'Write release notes'",
    path: "/board.html",
    setup: async (page) => {
      await page.click("tr[data-task-id=t3] [data-action=delete]");
    },
    targets: [
      { target: "Red 'Delete' button in the confirmation dialog", selector: "#confirm-delete" },
      { target: "'Cancel' button in the confirmation dialog", selector: "#confirm-cancel" },
    ],
    statements: [
      { statement: "The dialog asks to confirm deleting 'Write release notes'", holds: true },
      { statement: "The dialog asks to confirm deleting 'Design new pricing page'", holds: false },
    ],
  },
  {
    name: "board-search-empty",
    description: "Task board after searching for a word no task contains",
    path: "/board.html",
    setup: async (page) => {
      await page.fill("#search", "invoice");
    },
    targets: [
      { target: "'Clear search' button", selector: "#clear-search" },
      { target: "Search input containing 'invoice'", selector: "#search" },
      { target: "Delete icon in the 'Write release notes' row", selector: null, note: "The row is filtered out" },
    ],
    statements: [
      { statement: "No tasks match the search", holds: true },
      { statement: "The task 'Write release notes' is visible", holds: false },
    ],
  },
  {
    name: "board-done-tab",
    description: "Task board filtered to the 'Done' tab",
    path: "/board.html",
    setup: async (page) => {
      await page.click("[role=tab][data-filter=done]");
    },
    targets: [
      { target: "'Done' tab, currently selected", selector: "[role=tab][data-filter=done]" },
      { target: "Checkbox for 'Set up analytics events'", selector: "tr[data-task-id=t6] input[type=checkbox]" },
    ],
    statements: [
      { statement: "Only completed tasks are listed", holds: true },
      { statement: "The 'Audit current navigation' task is listed", holds: false },
    ],
  },
  {
    name: "settings-default",
    description: "Settings page with profile, notification toggles and an activity chart",
    path: "/settings.html",
    targets: [
      { target: "Full name input", selector: "#full-name" },
      { target: "Time zone dropdown", selector: "#time-zone" },
      { target: "Toggle for the weekly summary", selector: "#notify-weekly", note: "Switch with no text; name comes from aria-labelledby" },
      { target: "'Save changes' button", selector: "#save-settings" },
      { target: "'Delete account' button", selector: "#delete-account" },
      { target: "Bar chart of tasks completed per week", selector: "#activity-chart", note: "Canvas: only Visual Locate can find it" },
    ],
    statements: [
      { statement: "The weekly summary toggle is off", holds: true },
      { statement: "The email field can be edited", holds: false, note: "It is disabled" },
      { statement: "The tallest bar in the chart is for the week of Oct 20", holds: true, note: "Visual only: drawn on a canvas" },
    ],
  },
  {
    name: "settings-saved",
    description: "Settings page after turning on the weekly summary and saving",
    path: "/settings.html",
    setup: async (page) => {
      await page.click("#notify-weekly");
      await page.click("#save-settings");
    },
    targets: [
      { target: "'Settings saved' confirmation message", selector: "#saved-banner" },
      { target: "Toggle for the weekly summary", selector: "#notify-weekly" },
    ],
    statements: [
      { statement: "A message confirms the settings were saved", holds: true },
      { statement: "The weekly summary toggle is off", holds: false },
    ],
  },
];
