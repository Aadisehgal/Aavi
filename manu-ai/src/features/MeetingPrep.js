// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 14/20 — Proactive Consciousness Features 26-50
// File: src/features/MeetingPrep.js
// Generated: 2026-06-24

import AsyncStorage from '@react-native-async-storage/async-storage';

const MEETING_KEY = '@manu_ai_meeting_prep';
const TEMPLATES_KEY = '@manu_ai_meeting_templates';

class MeetingPrep {
  constructor() {
    this.templates = {
      standup: ['What did you accomplish yesterday?', 'What will you work on today?', 'Any blockers?'],
      review: ['Project status', 'Key metrics', 'Risks and mitigation', 'Next steps'],
      interview: ['Candidate background', 'Role fit', 'Technical assessment', 'Questions for candidate'],
      sales: ['Client needs', 'Product demo points', 'Pricing discussion', 'Closing strategy'],
      general: ['Meeting objective', 'Agenda items', 'Expected outcomes', 'Follow-up actions'],
    };
    this.prepHistory = [];
    this.loadData();
  }

  async loadData() {
    try {
      const data = await AsyncStorage.getItem(MEETING_KEY);
      if (data) this.prepHistory = JSON.parse(data);
      const templates = await AsyncStorage.getItem(TEMPLATES_KEY);
      if (templates) this.templates = { ...this.templates, ...JSON.parse(templates) };
    } catch (e) {
      console.warn('MeetingPrep load error:', e);
    }
  }

  async saveData() {
    try {
      await AsyncStorage.setItem(MEETING_KEY, JSON.stringify(this.prepHistory.slice(-50)));
      await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(this.templates));
    } catch (e) {
      console.warn('MeetingPrep save error:', e);
    }
  }

  async prepareForMeeting(meetingDetails) {
    const {
      title = 'Untitled Meeting',
      type = 'general',
      attendees = [],
      time,
      location,
      duration = 30,
      context = {},
    } = meetingDetails;

    const checklist = this.generateChecklist(type, attendees);
    const suggestedAgenda = this.generateAgenda(type, duration);
    const attendeeNotes = await this.generateAttendeeNotes(attendees);
    const materials = this.suggestMaterials(type, context);
    const reminders = this.generateReminders(time, location);

    const prep = {
      id: `prep_${Date.now()}`,
      meetingTitle: title,
      type,
      createdAt: Date.now(),
      checklist,
      suggestedAgenda,
      attendeeNotes,
      materials,
      reminders,
      travelBuffer: location ? this.calculateTravelBuffer(location) : null,
    };

    this.prepHistory.push(prep);
    await this.saveData();
    return prep;
  }

  generateChecklist(type, attendees) {
    const base = [
      'Review meeting agenda',
      'Prepare talking points',
      'Test audio/video if virtual',
      'Join 2 minutes early',
    ];

    if (attendees.length > 5) {
      base.push('Prepare to take structured notes');
    }
    if (type === 'interview') {
      base.push('Review candidate resume');
      base.push('Prepare evaluation rubric');
    }
    if (type === 'sales') {
      base.push('Review client history and previous interactions');
      base.push('Prepare pricing sheet');
    }
    if (type === 'review') {
      base.push('Gather latest metrics and data');
      base.push('Prepare demo environment');
    }

    return base;
  }

  generateAgenda(type, duration) {
    const template = this.templates[type] || this.templates.general;
    const items = template.map((item, index) => ({
      order: index + 1,
      topic: item,
      suggestedMinutes: Math.floor(duration / template.length),
      owner: 'TBD',
    }));
    return items;
  }

  async generateAttendeeNotes(attendees) {
    // In production, fetch from CRM/Contacts
    const notes = [];
    for (const attendee of attendees) {
      const recentInteractions = await this.getRecentInteractions(attendee.email || attendee.name);
      notes.push({
        name: attendee.name,
        role: attendee.role || 'Unknown',
        recentInteractions: recentInteractions.slice(-3),
        talkingPoints: this.suggestTalkingPoints(attendee.role),
      });
    }
    return notes;
  }

  async getRecentInteractions(identifier) {
    try {
      const data = await AsyncStorage.getItem(`@manu_ai_interactions_${identifier}`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  suggestTalkingPoints(role) {
    const map = {
      'Engineering Manager': ['Team capacity', 'Technical debt', 'Hiring pipeline'],
      'Product Manager': ['Roadmap alignment', 'User feedback', 'Feature priorities'],
      'CEO': ['Company metrics', 'Strategic direction', 'Competitive landscape'],
      'Client': ['Project status', 'Upcoming deliverables', 'Feedback on current work'],
      'Candidate': ['Career goals', 'Technical interests', 'Company culture questions'],
    };
    return map[role] || ['General project updates', 'Open questions'];
  }

  suggestMaterials(type, context) {
    const materials = [];
    if (type === 'review') {
      materials.push('Latest dashboard/metrics');
      materials.push('Sprint board link');
    }
    if (type === 'sales') {
      materials.push('Product demo deck');
      materials.push('Pricing sheet');
      materials.push('Case studies');
    }
    if (type === 'interview') {
      materials.push('Candidate resume');
      materials.push('Interview scorecard');
    }
    if (context.documents) {
      materials.push(...context.documents);
    }
    return materials;
  }

  generateReminders(meetingTime, location) {
    const reminders = [];
    if (meetingTime) {
      const meetingTs = new Date(meetingTime).getTime();
      const now = Date.now();
      const diffMinutes = (meetingTs - now) / 60000;

      if (diffMinutes > 15) {
        reminders.push({ when: meetingTs - 15 * 60000, text: 'Meeting in 15 minutes — final prep' });
      }
      if (diffMinutes > 60 && location) {
        reminders.push({ when: meetingTs - 60 * 60000, text: 'Meeting in 1 hour — check travel time' });
      }
      if (diffMinutes > 1440) {
        reminders.push({ when: meetingTs - 1440 * 60000, text: 'Meeting tomorrow — review agenda' });
      }
    }
    return reminders;
  }

  calculateTravelBuffer(location) {
    // In production, uses TravelCalc module
    return {
      estimatedMinutes: 30,
      leaveBy: null,
      transportMode: 'driving',
    };
  }

  getPrepHistory() {
    return this.prepHistory;
  }

  getTemplates() {
    return this.templates;
  }

  addTemplate(name, items) {
    this.templates[name] = items;
    this.saveData();
  }
}

export default new MeetingPrep();
