/**
 * Wizard footer visibility — fails if Skip/Back/Next rules drift from updateFooterNav().
 * Run: node js/check-wizard-footer.js
 */
function footerVisibility(step) {
  return {
    back: step > 1,
    skip: step >= 2 && step <= 5,
    next: step < 7,
    nextLabel: step === 6 ? "Generate Prompt" : "Next",
  };
}

const expect = [
  [1, { back: false, skip: false, next: true, nextLabel: "Next" }],
  [2, { back: true, skip: true, next: true, nextLabel: "Next" }],
  [5, { back: true, skip: true, next: true, nextLabel: "Next" }],
  [6, { back: true, skip: false, next: true, nextLabel: "Generate Prompt" }],
  [7, { back: true, skip: false, next: false, nextLabel: "Next" }],
];

let failed = 0;
for (const [step, want] of expect) {
  const got = footerVisibility(step);
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    failed++;
    console.error("FAIL step", step, "got", got, "want", want);
  }
}
if (failed) process.exit(1);
console.log("ok: wizard footer visibility (" + expect.length + " cases)");
