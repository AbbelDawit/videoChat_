var omeID = localStorage.getItem("omeID");
if (omeID) {
window.addEventListener("unload", function (event) {
  $.ajax({
    url: "/leaving-user-update/" + omeID + "",
    type: "PUT",
    success: function (response) {
//       alert(response);
    },
  });
});
$.ajax({
  url: "/leaving-user-update/" + omeID + "",
  type: "PUT",
  success: function (response) {
//     alert(response);
  },
});
}

// Display the age verification popup on page load
document.addEventListener("DOMContentLoaded", function() {
  var ageVerificationModal = document.getElementById("ageVerificationModal");
  ageVerificationModal.style.display = "block";
});

// Perform age verification when the "Verify Age" button is clicked
document.getElementById("verifyAgeBtn").addEventListener("click", function() {
  var ageCheckbox = document.getElementById("ageCheckbox");

  if (ageCheckbox.checked) {
      // Age verified, close the popup and proceed with your website
      var ageVerificationModal = document.getElementById("ageVerificationModal");
      ageVerificationModal.style.display = "none";
  } else {
      // Show a toast error message for media devices
      Toastify({
        text: "You must be 18 years or older to access this site.",
        duration: 3000, // Duration in milliseconds
        gravity: "top", // toast position, 'top' or 'bottom'
        position: "center", // toast position, 'left', 'center' or 'right'
        stopOnFocus: true, // Stop timer when the toast is focused
        close: false, // Show close button
        className: "error-toast", // Custom class for styling
      }).showToast();
  }
});

function openNav() {
  document.getElementById("mySidenav").style.width = "100%";
}

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
}
