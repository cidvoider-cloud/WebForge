/**
 * WebForge Studio — ES Module Entry Point
 */

import { WebForgeStudio } from './modules/studio.mjs';

const studio = new WebForgeStudio();
window.studio = studio;

// Global bridges required by inline onclick attributes inside the 7-step Prompt Builder markup
window.openPromptBuilderModal = () => studio.openPromptBuilderModal();
window.selectCard = (el, key) => studio.promptBuilder?.selectCard(el, key);
window.toggleFeature = (el) => studio.promptBuilder?.toggleFeature(el);
window.applyCustomColors = () => studio.promptBuilder?.applyCustomColors();
window.validateAndNext = (step) => studio.promptBuilder?.validateAndNext(step);
window.nextStep = () => studio.promptBuilder?.nextStep();
window.prevStep = () => studio.promptBuilder?.prevStep();
window.wizardFooterNext = () => {
  const pb = studio.promptBuilder;
  if (!pb) return;
  if (pb.currentStep === 1) pb.validateAndNext(1);
  else if (pb.currentStep === 6) pb.generatePrompt();
  else if (pb.currentStep < 7) pb.nextStep();
};
window.startOver = () => studio.promptBuilder?.startOver();
window.goToStep = (step) => studio.promptBuilder?.goToStep(step);
window.generatePrompt = () => studio.promptBuilder?.generatePrompt();
window.continueToChat = () => studio.promptBuilder?.continueToChat();
window.syncColor = (input, targetId) => studio.promptBuilder?.syncColor(input, targetId);
window.copyPrompt = () => studio.promptBuilder?.copyPrompt();
window.downloadPrompt = () => studio.promptBuilder?.downloadPrompt();
window.setPromptHeight = (h) => studio.promptBuilder?.setPromptHeight(h);

document.addEventListener('DOMContentLoaded', () => {
  studio.init();
});
