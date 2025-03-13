#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

// Configuration
const VERSION_FILE = path.join(__dirname, '..', 'VERSION.md');
const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');
const AGENT_ENGINE_PACKAGE = path.join(__dirname, '..', 'services', 'agent-engine', 'package.json');
const GIT_COMMIT_MESSAGE = 'chore: update version after successful tests';

// Function to run tests
function runTests() {
  console.log('Running tests...');
  try {
    // Run tests for agent-engine service
    execSync('cd services/agent-engine && npm test', { stdio: 'inherit' });
    console.log('Tests completed successfully!');
    return true;
  } catch (error) {
    console.error('Tests failed:', error.message);
    return false;
  }
}

// Function to update version in VERSION.md
function updateVersionFile() {
  console.log('Updating VERSION.md...');
  
  // Read current VERSION.md
  const versionContent = fs.readFileSync(VERSION_FILE, 'utf8');
  
  // Extract current version
  const versionMatch = versionContent.match(/## 当前版本：v(\d+)\.(\d+)\.(\d+)/);
  if (!versionMatch) {
    throw new Error('Could not find current version in VERSION.md');
  }
  
  const [, major, minor, patch] = versionMatch.map(Number);
  const newVersion = `${major}.${minor}.${parseInt(patch) + 1}`;
  console.log(`Incrementing version from v${major}.${minor}.${patch} to v${newVersion}`);
  
  // Get current date in YYYY-MM-DD format
  const currentDate = format(new Date(), 'yyyy-MM-dd');
  
  // Replace current version line with new version
  const updatedContent = versionContent.replace(
    /## 当前版本：v\d+\.\d+\.\d+ \(\d{4}-\d{2}-\d{2}\)/,
    `## 当前版本：v${newVersion} (${currentDate})`
  );
  
  // Write updated content back to VERSION.md
  fs.writeFileSync(VERSION_FILE, updatedContent);
  
  return newVersion;
}

// Function to update version in package.json files
function updatePackageVersions(newVersion) {
  console.log('Updating package.json versions...');
  
  // Update root package.json versionInfo
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  packageJson.versionInfo.lastUpdated = format(new Date(), 'yyyy-MM-dd');
  fs.writeFileSync(PACKAGE_JSON, JSON.stringify(packageJson, null, 2) + '\n');
  
  // Update agent-engine package.json
  if (fs.existsSync(AGENT_ENGINE_PACKAGE)) {
    const agentPackageJson = JSON.parse(fs.readFileSync(AGENT_ENGINE_PACKAGE, 'utf8'));
    agentPackageJson.version = newVersion;
    fs.writeFileSync(AGENT_ENGINE_PACKAGE, JSON.stringify(agentPackageJson, null, 2) + '\n');
  }
}

// Function to commit and push changes
function commitAndPush(version) {
  console.log('Committing and pushing changes...');
  
  try {
    // Add files to git
    execSync('git add VERSION.md package.json services/agent-engine/package.json', { stdio: 'inherit' });
    
    // Commit changes
    execSync(`git commit -m "${GIT_COMMIT_MESSAGE} v${version}"`, { stdio: 'inherit' });
    
    // Push to GitHub
    execSync('git push', { stdio: 'inherit' });
    
    console.log('Changes pushed to GitHub successfully!');
    return true;
  } catch (error) {
    console.error('Failed to push changes:', error.message);
    return false;
  }
}

// Main function
function main() {
  // Ensure we're in the project root
  if (!fs.existsSync(VERSION_FILE) || !fs.existsSync(PACKAGE_JSON)) {
    console.error('Error: Script must be run from the project root directory');
    process.exit(1);
  }
  
  // Run tests
  const testsSucceeded = runTests();
  if (!testsSucceeded) {
    console.log('Aborting version update due to test failures');
    process.exit(1);
  }
  
  // Update version files
  const newVersion = updateVersionFile();
  updatePackageVersions(newVersion);
  
  // Commit and push changes
  const pushSucceeded = commitAndPush(newVersion);
  if (!pushSucceeded) {
    console.log('Failed to push changes to GitHub');
    process.exit(1);
  }
  
  console.log(`Successfully updated to version v${newVersion} and pushed to GitHub!`);
}

// Run the main function
main(); 