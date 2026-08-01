class Tracker:

    def __init__(self):
        self.sent_ids = set()

    def is_new(self, track_id):

        if track_id is None:
            return True

        if track_id in self.sent_ids:
            return False

        self.sent_ids.add(track_id)
        return True