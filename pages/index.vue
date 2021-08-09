<script>
export default {
  middleware({ redirect, route } ) {
    return redirect({ name: 'clusters' });
  },
};
</script>
