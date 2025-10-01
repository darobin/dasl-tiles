
export const rickMeta = {
  name: "First Tile",
  resources: {
    "/": {
      src: {
        $link: "bafkreidcmg66nzp5ldng52laqfz23h2kf6h3ftp2rv2pwnuprih2yodz4m"
      },
      "content-type": "text/html"
    },
    "/img/rick.jpg": {
      src: {
        $link: "bafkreifn5yxi7nkftsn46b6x26grda57ict7md2xuvfbsgkiahe2e7vnq4"
      },
      "content-type": "image/jpeg"
    }
  },
  description: "This is a very basic tile with no interactivity, but it won't let you down."
};

export const rickMetaRaw = {
  ...rickMeta,
  roots: [],
  version: 1,
}
