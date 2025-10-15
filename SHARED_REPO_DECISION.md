# Should Shared Library Be a Separate Repository?

## Current State: Shared in Main Repo ✅

Currently, `esp32/shared/` lives directly in the main RayZ repository, not as a submodule.

## Option 1: Keep Shared in Main Repo (Current) 🟢

### ✅ Pros

1. **Simplicity**
   - One less submodule to manage
   - No need to update two repos for protocol changes
   - Easier for beginners to understand

2. **Atomic Updates**
   - Change shared code and update target/weapon references in one commit
   - See full history of shared library in main repo
   - No submodule synchronization issues

3. **Easier Development**
   - Edit shared files directly
   - Immediate availability to target/weapon
   - No push/pull between repos

4. **Better for Small Teams**
   - Less overhead
   - Faster iteration
   - Single source of truth in one place

5. **Version Control**
   - Main repo tags include shared library state
   - Clear snapshot of everything at any point
   - Less confusion about compatibility

### ❌ Cons

1. **No Independent Versioning**
   - Can't have shared v1.0.0 work with target v2.0.0
   - Must update shared in main repo, then update submodules

2. **Harder to Use in Other Projects**
   - If you want to reuse shared library elsewhere, harder to include
   - Can't just add as submodule to another project

3. **Coupling**
   - Changes to shared require main repo commit
   - Can't work on shared library independently

4. **Size**
   - Main repo includes all shared library history
   - (Minor issue in practice)

## Option 2: Make Shared a Separate Repo 🟡

### ✅ Pros

1. **Independent Versioning**
   - Tag shared library separately: v1.0.0, v1.1.0, etc.
   - Target v1.0.0 can specify "use shared v1.2.0"
   - Weapon v2.0.0 can specify "use shared v1.5.0"

2. **Reusability**
   - Easy to use in other projects
   - Just add as submodule: `git submodule add <url>`
   - Could publish as PlatformIO library

3. **Clear Separation**
   - Shared library has its own issues/PRs
   - Dedicated team can own it
   - Clear API boundaries

4. **Flexibility**
   - Different projects can use different shared versions
   - Breaking changes don't force immediate updates
   - Better for multiple products

5. **Professional Structure**
   - Scales better for large teams
   - Clear dependency management
   - Better CI/CD separation

### ❌ Cons

1. **Complexity**
   - Now managing 5 repos instead of 4
   - More submodule commands to learn
   - Easier to get out of sync

2. **More Steps for Changes**
   ```bash
   # Before (current):
   cd esp32/shared
   # edit file
   git add . && git commit -m "Update"
   git push
   
   # After (if separate repo):
   cd esp32/shared
   # edit file
   git add . && git commit -m "Update"
   git push origin main
   git tag v1.1.0 && git push --tags
   cd ../target
   # update code to use new feature
   git add . && git commit && git push
   cd ../..
   git add esp32/shared esp32/target
   git commit -m "Update shared and target"
   git push
   ```

3. **Synchronization Issues**
   - Can forget to update submodule reference
   - Harder to see what shared version is used
   - Need to manage compatibility matrix

4. **Development Friction**
   - Can't test changes immediately
   - Must commit/push to share with target/weapon
   - Slows down rapid prototyping

## 🎯 Recommendation

### Keep Shared in Main Repo IF:
- ✅ Small team (1-3 developers) **← You are here**
- ✅ Rapid development/prototyping phase **← You are here**
- ✅ Target and weapon always updated together
- ✅ No plans to reuse library in other projects
- ✅ Want simplicity over flexibility

### Make Shared Separate Repo IF:
- 🔄 Large team (5+ developers)
- 🔄 Shared library needs independent versioning
- 🔄 Target and weapon deployed independently to field
- 🔄 Want to reuse shared library in other projects
- 🔄 Multiple products sharing the library
- 🔄 Strict API stability requirements

## 📊 Comparison Table

| Aspect | In Main Repo | Separate Repo |
|--------|--------------|---------------|
| **Simplicity** | 🟢 Simple | 🟡 Complex |
| **Setup Time** | 🟢 Quick | 🟡 More steps |
| **Independent Versions** | 🔴 No | 🟢 Yes |
| **Reusability** | 🟡 Harder | 🟢 Easy |
| **Development Speed** | 🟢 Fast | 🟡 Slower |
| **Team Coordination** | 🟢 Easy | 🟡 Harder |
| **Scaling** | 🟡 Limited | 🟢 Better |
| **Learning Curve** | 🟢 Easy | 🟡 Steeper |

## 💡 My Recommendation for RayZ

**Keep shared in main repo for now** because:

1. **You're in early development** - Need to iterate quickly
2. **Small team** - Don't need the complexity overhead
3. **Target and weapon are tightly coupled** - They share the same protocol
4. **Simpler workflow** - Less cognitive load, faster development

### When to Reconsider

Convert shared to a separate repo when you hit these milestones:

1. **Shared library becomes stable** (v1.0.0 finalized, rare changes)
2. **Need backwards compatibility** (field devices can't all update at once)
3. **Multiple products** (want to reuse in RayZ v2, other projects)
4. **Team grows** (>5 people, need clear ownership)
5. **External contributors** (want to accept PRs to shared library separately)

## 🔄 Migration Path (If Needed Later)

If you decide to split it later, here's how:

```bash
# 1. Create new repo
gh repo create David-ssnd/rayz-shared --public

# 2. Initialize shared as separate repo
cd esp32/shared
git init
git add .
git commit -m "Initial shared library"
git remote add origin https://github.com/David-ssnd/rayz-shared.git
git push -u origin main
git tag v1.0.0 && git push --tags

# 3. Remove from main repo and add as submodule
cd ../..
git rm -r esp32/shared
git commit -m "Remove shared directory"
git submodule add https://github.com/David-ssnd/rayz-shared.git esp32/shared
git commit -m "Add shared as submodule"

# 4. Update target and weapon to reference submodule
# (No changes needed - they already use ../shared/lib)

# 5. Update .gitmodules
# Done automatically by git submodule add
```

## 🎬 Final Answer

**Don't make it a separate repo yet.** You'll know when you need to because:
- You'll be frustrated by coupling
- You'll have stability requirements
- You'll need backwards compatibility

Until then, enjoy the simplicity! 🚀

## 📝 Current Decision

**Status:** ✅ **UPDATED - Now a separate repository**  
**Date:** October 15, 2025  
**Changed:** October 15, 2025 (same day!)  
**Reason:** Decision to go with separate repo for better modularity and reusability

### Implemented Changes:
- ✅ Created https://github.com/David-ssnd/rayz-shared
- ✅ Added as submodule to main RayZ repo
- ✅ Tagged as v1.0.0
- ✅ Target and weapon already configured to use it

---

*This decision can be revisited as the project matures. The migration path above ensures we can change our mind later without major disruption.*
