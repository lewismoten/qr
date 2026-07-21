import {
  formatCalendarInputDate,
  formatCalendarInputTime,
  serializeCalendarEvent,
} from '../../../data/calendar.js';

const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const MILLISECONDS_PER_HOUR =
  SECONDS_PER_MINUTE * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export function createEventSection({
  title,
  allDay,
  startDate,
  startTime,
  endDate,
  endTime,
  location,
  description,
  url,
  timeFields,
}) {
  const initialize = () => {
    const start = new Date();
    start.setSeconds(0, 0);
    start.setMinutes(0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start.getTime() + MILLISECONDS_PER_HOUR);
    startDate.value = formatCalendarInputDate(start);
    startTime.value = formatCalendarInputTime(start);
    endDate.value = formatCalendarInputDate(end);
    endTime.value = formatCalendarInputTime(end);
  };

  const sync = () => {
    startTime.disabled = allDay.checked;
    endTime.disabled = allDay.checked;
    timeFields.forEach((field) =>
      field.classList.toggle('is-disabled', allDay.checked),
    );
  };

  const buildPayload = () =>
    serializeCalendarEvent({
      title: title.value,
      allDay: allDay.checked,
      startDate: startDate.value,
      startTime: startTime.value,
      endDate: endDate.value,
      endTime: endTime.value,
      location: location.value,
      description: description.value,
      url: url.value,
    });

  return { initialize, sync, buildPayload };
}

export function createEventSectionFromDocument(document) {
  return createEventSection({
    title: document.getElementById('event-title'),
    allDay: document.getElementById('event-all-day'),
    startDate: document.getElementById('event-start-date'),
    startTime: document.getElementById('event-start-time'),
    endDate: document.getElementById('event-end-date'),
    endTime: document.getElementById('event-end-time'),
    location: document.getElementById('event-location'),
    description: document.getElementById('event-description'),
    url: document.getElementById('event-url'),
    timeFields: document.querySelectorAll('.event-time-field'),
  });
}
