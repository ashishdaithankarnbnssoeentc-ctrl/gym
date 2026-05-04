/**
 * Scroll Utilities
 * Handles smooth scrolling with dynamic navbar offset
 */

import { UI_CONFIG } from '../config/constants';

/**
 * Scroll to element with dynamic navbar offset
 * Queries actual navbar height instead of hardcoding
 */
export function scrollToSection(sectionId: string): void {
  const element = document.getElementById(sectionId);
  if (!element) return;

  // Query actual navbar height (safer than hardcoded)
  const navbar = document.querySelector('header');
  const navbarHeight = navbar?.offsetHeight || UI_CONFIG.NAVBAR_OFFSET;

  const elementPosition = element.offsetTop - navbarHeight;

  window.scrollTo({
    top: elementPosition,
    behavior: 'smooth',
  });
}
