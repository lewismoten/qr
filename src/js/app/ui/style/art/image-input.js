export function createImageInputController({ input, clearButton, onUpdate }) {
  let image = null;
  let objectUrl = '';
  let loadRequest = 0;

  const revokeObjectUrl = () => {
    if (!objectUrl) return;
    URL.revokeObjectURL(objectUrl);
    objectUrl = '';
  };

  const notify = () => onUpdate(image);

  input.addEventListener('change', () => {
    const request = ++loadRequest;
    revokeObjectUrl();
    image = null;
    const [file] = input.files || [];
    if (!file || !file.type.startsWith('image/')) {
      notify();
      return;
    }

    objectUrl = URL.createObjectURL(file);
    const candidate = new Image();
    candidate.onload = () => {
      if (request !== loadRequest) return;
      image = candidate;
      revokeObjectUrl();
      notify();
    };
    candidate.onerror = () => {
      if (request !== loadRequest) return;
      image = null;
      revokeObjectUrl();
      notify();
    };
    candidate.src = objectUrl;
  });

  clearButton.addEventListener('click', () => {
    loadRequest += 1;
    revokeObjectUrl();
    image = null;
    input.value = '';
    notify();
  });

  return { getImage: () => image };
}
