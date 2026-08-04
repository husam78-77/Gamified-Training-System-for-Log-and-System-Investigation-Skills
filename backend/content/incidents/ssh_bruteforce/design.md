# SSH Brute Force Investigation

## Overview

This incident is the first investigation scenario in KINETIC BREACH.

The objective is to teach beginner cybersecurity students how to investigate an SSH brute force attack using realistic Linux artifacts rather than following predefined command sequences.

The scenario is inspired by real-world SSH authentication investigations and MITRE ATT&CK T1110.001 (Password Guessing), but has been simplified for educational purposes.

---

# Difficulty

Beginner

Estimated Time

20–30 Minutes

Category

Authentication

Platform

Ubuntu Server 22.04 LTS

---

# Learning Objectives

After completing this investigation the learner should be able to:

- Recognize SSH brute force attack patterns.
- Read Linux authentication logs.
- Differentiate between failed and successful SSH authentication.
- Identify the attack source.
- Identify the compromised account.
- Support conclusions using collected evidence.

---

# Story

NovaTech Solutions' Security Operations Center (SOC) detected an unusual number of SSH authentication attempts against one of the company's production Linux servers.

Although the server is still operational, analysts are unsure whether the attack succeeded or if it was simply internet background noise.

You have been assigned as the investigator responsible for determining what happened before any response actions are taken.

---

# Investigation Timeline

02:08
Server operating normally.

02:11
Multiple SSH authentication failures begin.

02:12
Authentication succeeds.

02:12
SSH session opened.

02:13
Attacker executes basic reconnaissance commands.

- whoami
- ls /home

02:14
SSH session closed.

09:15
SOC receives security alert.

09:20
Investigation assigned.

---

# Internal Scenario Truth

This section is NOT visible to the learner.

The attacker successfully guessed the password of the account:

admin

The attacker connected through SSH.

Only two commands were executed.

whoami

ls /home

The attacker disconnected without establishing persistence or modifying the system.

This limitation is intentional because this scenario focuses only on authentication investigation.

---

# Investigation Objectives

The learner must determine:

1. What IP address performed the attack?

2. Was authentication successful?

3. Which account was compromised?

4. What evidence supports these findings?

---

# Success Criteria

The learner successfully completes the investigation after submitting:

- Investigation Report
- Terminal History

The quality of the investigation is evaluated separately by the AI review system.

---

# Evidence Philosophy

Every conclusion made by the learner must be supported by at least one artifact inside the virtual environment.

The scenario intentionally avoids hidden information.

If the learner cannot prove a conclusion using available evidence, the conclusion should not be accepted.

---

# Primary Evidence

/var/log/auth.log

Supporting Evidence

/etc/passwd

/home/admin/.bash_history

Optional Evidence

/var/log/syslog

/etc/hostname

/etc/os-release

---

# Browser Knowledge

The Browser provides investigation references only.

It never reveals the solution.

Available pages:

- SSH Authentication
- Linux auth.log
- Password Guessing
- Linux Investigation Tips

---

# ARIA

ARIA never gives direct answers.

Instead, it provides contextual hints based on:

- discoveries
- commands used
- opened evidence
- current investigation progress

---

# Investigation Report

Learners prepare their own investigation report inside:

/home/investigator/investigation_report.txt

The report should contain:

- Source IP
- Compromised Account
- Authentication Result
- Supporting Evidence
- Additional Notes

---

# Educational Adaptations

To make the investigation suitable for beginners:

- Attack duration has been shortened.
- Only one compromised account exists.
- No persistence mechanisms are present.
- No malware is deployed.
- Only minimal post-authentication activity occurs.

These adaptations preserve the investigation methodology while reducing unnecessary complexity.
