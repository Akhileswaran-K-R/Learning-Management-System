/* eslint-disable no-unused-vars */
const token = document
  .querySelector('meta[name="csrf-token"]')
  .getAttribute("content");

function enroll(id) {
  fetch(`/courses/${id}/enroll`, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      _csrf: token,
    }),
  })
    .then((res) => {
      if (res.ok) {
        window.location.href = `/courses/${id}/chapters`;
      }
    })
    .catch((error) => {
      console.error(error);
    });
}
