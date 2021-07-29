<script>
export default {
  middleware({ redirect, route } ) {
    if (process.client) {
      const title = route.query?.title;

      if (title && title !== window.localStorage.getItem('dashbaord_title')) {
        window.localStorage.setItem('dashbaord_title', title);
      }
    }

    return redirect({ name: 'clusters' });
  },
};
</script>
