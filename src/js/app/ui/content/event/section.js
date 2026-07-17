import { formatCalendarInputDate, formatCalendarInputTime, serializeCalendarEvent } from '../../../calendar.js';

export function createEventSection({ title, allDay, startDate, startTime, endDate, endTime, location, description, url, timeFields }) {
  const initialize = () => {
    const start = new Date();
    start.setSeconds(0, 0);
    start.setMinutes(0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    startDate.value = formatCalendarInputDate(start);
    startTime.value = formatCalendarInputTime(start);
    endDate.value = formatCalendarInputDate(end);
    endTime.value = formatCalendarInputTime(end);
  };

  const sync = () => {
    startTime.disabled = allDay.checked;
    endTime.disabled = allDay.checked;
    timeFields.forEach((field) => field.classList.toggle('is-disabled', allDay.checked));
  };

  const buildPayload = () => serializeCalendarEvent({
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
