# Version Management

This document describes how version management works in the LiqPro project.

## Automatic Version Updates

The project includes an automated version management system that:

1. Runs tests
2. Updates version numbers if tests pass
3. Commits and pushes changes to GitHub

This process ensures that each successful test run is recorded with a version number, making it easy to track progress and identify when specific features or fixes were implemented.

## How It Works

### Manual Execution

You can manually trigger the version update process by running:

```bash
npm run update-version
```

This will:

1. Run the tests for the agent-engine service
2. If tests pass, increment the patch version in VERSION.md
3. Update the lastUpdated field in package.json
4. Update the version in services/agent-engine/package.json
5. Commit these changes with a standardized message
6. Push the changes to GitHub

### Automatic Execution via GitHub Actions

A GitHub Actions workflow is configured to automatically run tests when changes are pushed to the main branch. If the tests pass, it will update the version numbers and push the changes back to the repository.

This workflow is defined in `.github/workflows/test-and-version.yml`.

## Version Format

The project follows semantic versioning (SemVer) with the format `vX.Y.Z`:

- **X** (Major): Incremented for incompatible API changes
- **Y** (Minor): Incremented for new functionality in a backward-compatible manner
- **Z** (Patch): Incremented for backward-compatible bug fixes and minor improvements

The automated process only increments the patch version. Major and minor version updates should be done manually when appropriate.

## Version History

All version history is maintained in the `VERSION.md` file, which includes:

- The current version number and date
- A summary of major updates in the current version
- Fixed issues
- Next steps
- A history of previous versions

## Best Practices

1. **Run tests before committing**: Always ensure tests pass before pushing changes
2. **Review version history**: Check VERSION.md to understand recent changes
3. **Manual version bumps**: For significant changes, manually update the major or minor version numbers
4. **Include detailed notes**: When updating VERSION.md manually, include detailed notes about changes
