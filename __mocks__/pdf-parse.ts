// Manual mock for pdf-parse module
export class PDFParse {
  private data: Buffer;

  constructor(options: { data: Buffer }) {
    this.data = options.data;
  }

  async getText() {
    return {
      text: 'This is extracted text from PDF',
      pages: Array(5).fill({ text: 'page content' }),
    };
  }

  async getInfo() {
    return {
      info: {
        Title: 'Test Document',
        Author: 'Test Author',
      },
      metadata: {
        CreationDate: '2024-01-01',
      },
      total: 5,
      getDateNode: () => ({
        CreationDate: new Date('2024-01-01'),
        ModDate: new Date('2024-01-02'),
      }),
    };
  }
}

export default PDFParse;
